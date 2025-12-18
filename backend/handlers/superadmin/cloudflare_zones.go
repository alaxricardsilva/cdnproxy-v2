package superadmin

import (
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/services/cloudflare"
)

// ListZonesHandler handles GET requests to list Cloudflare zones
func ListZonesHandler(w http.ResponseWriter, r *http.Request) {
	service := cloudflare.NewService()
	zones, err := service.ListZones()
	if err != nil {
		http.Error(w, "Failed to list zones: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(zones)
}

// CreateZoneHandler handles POST requests to create a new Cloudflare zone
func CreateZoneHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Domain name is required", http.StatusBadRequest)
		return
	}

	service := cloudflare.NewService()
	zone, err := service.CreateZone(req.Name)
	if err != nil {
		http.Error(w, "Failed to create zone: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(zone)
}
