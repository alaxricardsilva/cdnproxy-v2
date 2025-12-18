package admin

import (
	"encoding/json"
	"fmt"
	"net/http"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
	"CDNProxy_v2/backend/models"
)

func GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusInternalServerError)
		return
	}

	var u models.User
	err := database.DB.QueryRow(r.Context(), "SELECT id, email, role, active, created_at, COALESCE(name, '') FROM users WHERE id = $1", userID).Scan(&u.ID, &u.Email, &u.Role, &u.IsActive, &u.CreatedAt, &u.Name)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	fmt.Printf("GetProfile - User: %s, Name: %v\n", u.Email, u.Name)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusInternalServerError)
		return
	}

	var p struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Update name if provided
    // Note: Email update might require re-verification flow in Supabase, preventing simple update here for now unless synchronized.
    // For now we will focus on updating the Name.
	_, err := database.DB.Exec(r.Context(), "UPDATE users SET name = $1 WHERE id = $2", p.Name, userID)
	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"message": "Perfil atualizado com sucesso"}`))
}
