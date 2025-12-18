package superadmin

import (
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
	"golang.org/x/net/context"
)

type CloudflareConfig struct {
	APIKey string `json:"api_key"`
	Email  string `json:"email"`
}

func CloudflareConfigHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getCloudflareConfig(w, r)
	case http.MethodPut:
		updateCloudflareConfig(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getCloudflareConfig(w http.ResponseWriter, r *http.Request) {
	var apiKey, email string

	err := database.DB.QueryRow(context.Background(), "SELECT value FROM general_configs WHERE key = 'cloudflare_api_key'").Scan(&apiKey)
	if err != nil {
		// Handle case where key is not found, but don't return an error
	}

	err = database.DB.QueryRow(context.Background(), "SELECT value FROM general_configs WHERE key = 'cloudflare_email'").Scan(&email)
	if err != nil {
		// Handle case where key is not found, but don't return an error
	}

	config := CloudflareConfig{
		APIKey: apiKey,
		Email:  email,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func updateCloudflareConfig(w http.ResponseWriter, r *http.Request) {
	var config CloudflareConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(context.Background(), `
		INSERT INTO general_configs (key, value) VALUES ('cloudflare_api_key', $1), ('cloudflare_email', $2)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
	`, config.APIKey, config.Email)

	if err != nil {
		http.Error(w, "Failed to update Cloudflare config", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
