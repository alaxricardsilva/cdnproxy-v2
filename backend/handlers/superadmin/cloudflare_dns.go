package superadmin

import (
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/services/cloudflare"

	"github.com/gorilla/mux"
)

// GetZoneDetailsHandler returns details of a zone
func GetZoneDetailsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]

	service := cloudflare.NewService()
	zone, err := service.GetZoneDetails(zoneID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(zone)
}

// ListDNSRecordsHandler lists DNS records for a zone
func ListDNSRecordsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]

	service := cloudflare.NewService()
	records, err := service.ListDNSRecords(zoneID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}

// CreateDNSRecordHandler creates a new DNS record
func CreateDNSRecordHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]

	var record cloudflare.DNSRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	service := cloudflare.NewService()
	newRecord, err := service.CreateDNSRecord(zoneID, record)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newRecord)
}

// UpdateDNSRecordHandler updates a DNS record
func UpdateDNSRecordHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]
	recordID := vars["record_id"]

	var record cloudflare.DNSRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	service := cloudflare.NewService()
	updatedRecord, err := service.UpdateDNSRecord(zoneID, recordID, record)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedRecord)
}

// DeleteDNSRecordHandler deletes a DNS record
func DeleteDNSRecordHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	zoneID := vars["id"]
	recordID := vars["record_id"]

	service := cloudflare.NewService()
	if err := service.DeleteDNSRecord(zoneID, recordID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
