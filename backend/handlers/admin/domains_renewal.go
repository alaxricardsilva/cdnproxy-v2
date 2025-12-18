package admin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
	"CDNProxy_v2/backend/models"
)

func DomainsRenewalHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	rows, err := database.DB.Query(context.Background(), "SELECT id, user_id, name, expired_at FROM public.domains WHERE user_id = $1 AND expired_at BETWEEN NOW() AND NOW() + INTERVAL '30 day' ORDER BY expired_at ASC", userID)
	if err != nil {
		http.Error(w, "Failed to query domains for renewal", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var domains []models.Domain
	for rows.Next() {
		var d models.Domain
		if err := rows.Scan(&d.ID, &d.UserID, &d.Name, &d.ExpiredAt); err != nil {
			http.Error(w, "Failed to scan domain", http.StatusInternalServerError)
			return
		}
		domains = append(domains, d)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error iterating over domains", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(domains)
}
