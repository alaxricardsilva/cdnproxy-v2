package superadmin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/models"

	"github.com/gorilla/mux"
)

// setExpiryTime ajusta a data de expiração para o final do dia (23:59:59)
func setExpiryTime(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 23, 59, 59, 0, t.Location())
}

func GetAllDomains(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query(r.Context(), `
		SELECT d.id, d.name, d.dominio, d.user_id, d.expired_at, d.target_url, d.plan_id, d.active, u.email, COALESCE(u.name, '')
		FROM domains d
		JOIN users u ON d.user_id = u.id
		ORDER BY d.id DESC
	`)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to query domains: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var domains []struct {
		models.Domain
		UserEmail string `json:"user_email"`
		UserName  string `json:"user_name"`
	}

	for rows.Next() {
		var d models.Domain
		var email string
		var name string
		if err := rows.Scan(&d.ID, &d.Name, &d.Dominio, &d.UserID, &d.ExpiredAt, &d.TargetURL, &d.PlanID, &d.Active, &email, &name); err != nil {
			http.Error(w, "Failed to scan domain", http.StatusInternalServerError)
			return
		}
		domains = append(domains, struct {
			models.Domain
			UserEmail string `json:"user_email"`
			UserName  string `json:"user_name"`
		}{d, email, name})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(domains)
}

func CreateDomain(w http.ResponseWriter, r *http.Request) {
	var d models.Domain
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	d.ExpiredAt = setExpiryTime(d.ExpiredAt)

	_, err := database.DB.Exec(
		r.Context(),
		"INSERT INTO domains (name, dominio, user_id, expired_at, target_url, plan_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())",
		d.Name,
		d.Dominio,
		d.UserID,
		d.ExpiredAt,
		d.TargetURL,
		d.PlanID,
	)
	if err != nil {
		http.Error(w, "Failed to create domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func UpdateDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	// Superadmin pode editar qualquer domínio, mesmo expirado.

	var d models.Domain
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Ajustar hora para fim do dia, se desejado, ou manter a data enviada (que já é formatada pelo frontend/backend)
	// d.ExpiredAt = setExpiryTime(d.ExpiredAt)

	_, err = database.DB.Exec(
		r.Context(),
		"UPDATE domains SET name = $1, dominio = $2, user_id = $3, target_url = $4, plan_id = $5, expired_at = $6, updated_at = NOW() WHERE id = $7",
		d.Name,
		d.Dominio,
		d.UserID,
		d.TargetURL,
		d.PlanID,
		d.ExpiredAt,
		id,
	)
	if err != nil {
		http.Error(w, "Failed to update domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeleteDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(r.Context(), "DELETE FROM domains WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func RenewDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	var payload struct {
		NewExpiryDate time.Time `json:"new_expiry_date"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	newExpiry := setExpiryTime(payload.NewExpiryDate)

	_, err = database.DB.Exec(r.Context(), "UPDATE domains SET expired_at = $1 WHERE id = $2", newExpiry, id)
	if err != nil {
		http.Error(w, "Failed to renew domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func GetDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	var d models.Domain
	err = database.DB.QueryRow(
		r.Context(),
		"SELECT id, name, dominio, user_id, expired_at, target_url, plan_id, active FROM domains WHERE id = $1",
		id,
	).Scan(
		&d.ID,
		&d.Name,
		&d.Dominio,
		&d.UserID,
		&d.ExpiredAt,
		&d.TargetURL,
		&d.PlanID,
		&d.Active,
	)
	if err != nil {
		http.Error(w, "Domain not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(d)
}

func ActivateDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(r.Context(), "UPDATE domains SET active = true WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to activate domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeactivateDomain(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid domain ID", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(r.Context(), "UPDATE domains SET active = false WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to deactivate domain", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
