package superadmin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/models"

	"github.com/gorilla/mux"
)

func GetAllPlans(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query(r.Context(), "SELECT id, name, price, description FROM public.plans")
	if err != nil {
		http.Error(w, "Failed to query plans", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var plans []models.Plan
	for rows.Next() {
		var p models.Plan
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Description); err != nil {
			http.Error(w, "Failed to scan plan", http.StatusInternalServerError)
			return
		}
		plans = append(plans, p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plans)
}

func GetPlan(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid plan ID", http.StatusBadRequest)
		return
	}

	var p models.Plan
	err = database.DB.QueryRow(r.Context(), "SELECT id, name, price, description FROM public.plans WHERE id = $1", id).Scan(&p.ID, &p.Name, &p.Price, &p.Description)
	if err != nil {
		http.Error(w, "Plan not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func CreatePlan(w http.ResponseWriter, r *http.Request) {
	var p models.Plan
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := database.DB.QueryRow(
		r.Context(),
		"INSERT INTO public.plans (name, price, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id",
		p.Name,
		p.Price,
		p.Description,
	).Scan(&p.ID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create plan: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

func UpdatePlan(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid plan ID", http.StatusBadRequest)
		return
	}

	var p models.Plan
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(
		r.Context(),
		"UPDATE public.plans SET name = $1, price = $2, description = $3, updated_at = NOW() WHERE id = $4",
		p.Name,
		p.Price,
		p.Description,
		id,
	)
	if err != nil {
		http.Error(w, "Failed to update plan", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeletePlan(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid plan ID", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(r.Context(), "DELETE FROM public.plans WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete plan", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
