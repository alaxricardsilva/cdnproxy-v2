package superadmin

import (
	"encoding/json"
	"net/http"
	"strconv"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/models"

	"github.com/gorilla/mux"
)

func GetAllTraffic(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query(r.Context(), "SELECT id, date, trafego, created_at, updated_at FROM daily_traffics")
	if err != nil {
		http.Error(w, "Failed to query traffic", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var traffic []models.DailyTraffic
	for rows.Next() {
		var t models.DailyTraffic
		if err := rows.Scan(&t.ID, &t.Date, &t.Trafego, &t.CreatedAt, &t.UpdatedAt); err != nil {
			http.Error(w, "Failed to scan traffic", http.StatusInternalServerError)
			return
		}
		traffic = append(traffic, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(traffic)
}

func GetTraffic(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid traffic ID", http.StatusBadRequest)
		return
	}

	var t models.DailyTraffic
	err = database.DB.QueryRow(r.Context(), "SELECT id, date, trafego, created_at, updated_at FROM daily_traffics WHERE id = $1", id).Scan(&t.ID, &t.Date, &t.Trafego, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		http.Error(w, "Traffic not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}

func ResetTrafficHandler(w http.ResponseWriter, r *http.Request) {
	_, err := database.DB.Exec(r.Context(), "DELETE FROM daily_traffics")
	if err != nil {
		http.Error(w, "Failed to reset daily_traffics", http.StatusInternalServerError)
		return
	}
	_, err = database.DB.Exec(r.Context(), "DELETE FROM monthly_traffic")
	if err != nil {
		http.Error(w, "Failed to reset monthly_traffic", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
