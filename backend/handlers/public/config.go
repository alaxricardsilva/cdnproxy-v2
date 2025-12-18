package public

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

func GetPublicConfig(w http.ResponseWriter, r *http.Request) {
	// Lista de chaves permitidas publicamente
	allowedKeys := []string{"app_name", "app_logo", "app_favicon", "support_email"}

	// Construir query segura
	query := "SELECT key, value FROM public.general_configs WHERE key = ANY($1)"

	rows, err := database.DB.Query(context.Background(), query, allowedKeys)
	if err != nil {
		http.Error(w, "Failed to query public configs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	configs := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		configs[key] = value
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configs)
}
