package superadmin

import (
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"

	"golang.org/x/net/context"
)

type Configuration struct {
	SiteName string `json:"site_name"`
	LogoURL  string `json:"logo_url"`
}

func ConfigurationHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getConfiguration(w, r)
	case http.MethodPut:
		updateConfiguration(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getConfiguration(w http.ResponseWriter, r *http.Request) {
	var siteName, logoURL string

	err := database.DB.QueryRow(context.Background(), "SELECT value FROM general_configs WHERE key = 'site_name'").Scan(&siteName)
	if err != nil {
		// Handle case where key is not found, but don't return an error
	}

	err = database.DB.QueryRow(context.Background(), "SELECT value FROM general_configs WHERE key = 'logo_url'").Scan(&logoURL)
	if err != nil {
		// Handle case where key is not found, but don't return an error
	}

	config := Configuration{
		SiteName: siteName,
		LogoURL:  logoURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func updateConfiguration(w http.ResponseWriter, r *http.Request) {
	var config Configuration
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(context.Background(), `
		INSERT INTO general_configs (key, value) VALUES ('site_name', $1), ('logo_url', $2)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
	`, config.SiteName, config.LogoURL)

	if err != nil {
		http.Error(w, "Failed to update configuration", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
