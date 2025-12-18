package admin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
)

type AdminDashboardData struct {
	TotalDomains     int              `json:"total_domains"`
	ActiveDomains    int              `json:"active_domains"`
	InactiveDomains  int              `json:"inactive_domains"`
	ExpiringDomains  int              `json:"expiring_domains"`
	ExpiringSoonList []ExpiringDomain `json:"expiring_soon_list"`
}

type ExpiringDomain struct {
	Name      string `json:"name"`
	ExpiredAt string `json:"expired_at"`
	DaysUntil int    `json:"days_until"`
}

func DashboardDataHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	var data AdminDashboardData

	// Get domain counts
	err := database.DB.QueryRow(context.Background(), `
		SELECT
			COUNT(*),
			COUNT(CASE WHEN active = true THEN 1 END),
			COUNT(CASE WHEN active = false THEN 1 END),
			COUNT(CASE WHEN expired_at BETWEEN NOW() AND NOW() + INTERVAL '30 day' THEN 1 END)
		FROM domains
		WHERE user_id = $1
	`, userID).Scan(&data.TotalDomains, &data.ActiveDomains, &data.InactiveDomains, &data.ExpiringDomains)

	if err != nil {
		http.Error(w, "Error fetching domain counts: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get list of domains expiring soon
	rows, err := database.DB.Query(context.Background(), `
		SELECT
			name,
			TO_CHAR(expired_at, 'DD/MM/YYYY'),
			EXTRACT(DAY FROM expired_at - NOW())
		FROM domains
		WHERE user_id = $1 AND expired_at BETWEEN NOW() AND NOW() + INTERVAL '30 day'
		ORDER BY expired_at ASC
	`, userID)
	if err != nil {
		http.Error(w, "Error fetching expiring domains: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var domain ExpiringDomain
		if err := rows.Scan(&domain.Name, &domain.ExpiredAt, &domain.DaysUntil); err != nil {
			http.Error(w, "Error scanning expiring domain: "+err.Error(), http.StatusInternalServerError)
			return
		}
		data.ExpiringSoonList = append(data.ExpiringSoonList, domain)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
