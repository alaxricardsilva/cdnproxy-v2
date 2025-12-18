package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
	"CDNProxy_v2/backend/models"

	"github.com/gorilla/mux"
)

type DomainWithPrice struct {
	models.Domain
	PlanPrice float64 `json:"plan_price"`
}

func GetUserDomains(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusInternalServerError)
		return
	}

	query := `
		SELECT d.id, d.name, d.user_id, d.expired_at, d.target_url, d.plan_id, d.active, COALESCE(p.price, 0)
		FROM domains d
		LEFT JOIN plans p ON d.plan_id = p.id
		WHERE d.user_id = $1
	`

	rows, err := database.DB.Query(r.Context(), query, userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to query domains: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var domains []DomainWithPrice
	for rows.Next() {
		var d DomainWithPrice
		if err := rows.Scan(&d.ID, &d.Name, &d.UserID, &d.ExpiredAt, &d.TargetURL, &d.PlanID, &d.Active, &d.PlanPrice); err != nil {
			http.Error(w, "Failed to scan domain", http.StatusInternalServerError)
			return
		}
		domains = append(domains, d)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(domains)
}

func UpdateUserDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusInternalServerError)
		return
	}

	// Verifica se o domínio pertence ao usuário e se não está expirado
	var d models.Domain
	err = database.DB.QueryRow(r.Context(), "SELECT user_id, expired_at FROM domains WHERE id = $1", id).Scan(&d.UserID, &d.ExpiredAt)
	if err != nil {
		http.Error(w, "Domain not found", http.StatusNotFound)
		return
	}

	if d.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if time.Now().After(d.ExpiredAt) {
		http.Error(w, "Cannot update an expired domain", http.StatusForbidden)
		return
	}

	var payload struct {
		TargetURL string `json:"target_url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(r.Context(), "UPDATE domains SET target_url = $1 WHERE id = $2", payload.TargetURL, id)
	if err != nil {
		http.Error(w, "Failed to update domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeleteUserDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusInternalServerError)
		return
	}

	// Verify ownership
	var ownerID int64
	err = database.DB.QueryRow(r.Context(), "SELECT user_id FROM domains WHERE id = $1", id).Scan(&ownerID)
	if err != nil {
		http.Error(w, "Domain not found", http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Delete domain
	_, err = database.DB.Exec(r.Context(), "DELETE FROM domains WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
