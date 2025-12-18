package superadmin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

// GeneralConfig represents a key-value pair for general configuration.
type GeneralConfig struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// GeneralConfigHandler handles GET and POST requests for general configurations.
func GeneralConfigHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		getGeneralConfigs(w, r)
	case http.MethodPost:
		updateGeneralConfigs(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getGeneralConfigs(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query(context.Background(), "SELECT key, value FROM public.general_configs")
	if err != nil {
		http.Error(w, "Failed to query general configs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	configs := make(map[string]string)
	for rows.Next() {
		var gc GeneralConfig
		if err := rows.Scan(&gc.Key, &gc.Value); err != nil {
			http.Error(w, "Failed to scan general config", http.StatusInternalServerError)
			return
		}
		configs[gc.Key] = gc.Value
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error iterating over general configs", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(configs)
}

func updateGeneralConfigs(w http.ResponseWriter, r *http.Request) {
	var configs map[string]string
	if err := json.NewDecoder(r.Body).Decode(&configs); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin(context.Background())
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background()) // Rollback in case of error

	for key, value := range configs {
		_, err := tx.Exec(context.Background(),
			`INSERT INTO public.general_configs (key, value, updated_at) VALUES ($1, $2, NOW())
			 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
			key, value)
		if err != nil {
			http.Error(w, "Failed to update general config", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(context.Background()); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Configurations updated successfully"})
}
