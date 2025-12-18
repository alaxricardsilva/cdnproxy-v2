package superadmin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

type SuperAdminDashboardData struct {
	TotalDomains      int              `json:"total_domains"`
	ActiveDomains     int              `json:"active_domains"`
	InactiveDomains   int              `json:"inactive_domains"`
	ExpiringDomains   int              `json:"expiring_domains"`
	TotalUsers        int              `json:"total_users"`
	MonthlyRequests   int              `json:"monthly_requests"`
	TotalTrafficBytes int64            `json:"total_traffic_bytes"`
	ExpiringSoonList  []ExpiringDomain `json:"expiring_soon_list"`
}

type ExpiringDomain struct {
	Name      string `json:"name"`
	ExpiredAt string `json:"expired_at"`
	DaysUntil int    `json:"days_until"`
}

func DashboardDataHandler(w http.ResponseWriter, r *http.Request) {
	var data SuperAdminDashboardData

	// Get domain counts
	err := database.DB.QueryRow(context.Background(), `
		SELECT
			COUNT(*),
			COUNT(CASE WHEN active = true THEN 1 END),
			COUNT(CASE WHEN active = false THEN 1 END),
			COUNT(CASE WHEN expired_at BETWEEN NOW() AND NOW() + INTERVAL '30 day' THEN 1 END)
		FROM domains
	`).Scan(&data.TotalDomains, &data.ActiveDomains, &data.InactiveDomains, &data.ExpiringDomains)

	if err != nil {
		http.Error(w, "Error fetching domain counts: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get user count
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM users").Scan(&data.TotalUsers)
	if err != nil {
		// Log error but don't fail entire request? Or fail? Let's generic handle
		data.TotalUsers = 0
	}

	// Get total requests (logs)
	// Counting all might be slow on large tables, but valid for now. Ideal is caching.
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM streaming_access_logs").Scan(&data.MonthlyRequests)
	if err != nil {
		data.MonthlyRequests = 0
	}

	// Get total traffic for current month
	// Assumindo que daily_traffics tem coluna 'trafego' (bigint/int8) e 'date' (date)
	err = database.DB.QueryRow(context.Background(), "SELECT COALESCE(SUM(trafego), 0) FROM daily_traffics WHERE date >= date_trunc('month', CURRENT_DATE)").Scan(&data.TotalTrafficBytes)
	if err != nil {
		data.TotalTrafficBytes = 0
	}

	// Get list of domains expiring soon
	rows, err := database.DB.Query(context.Background(), `
		SELECT
			name,
			TO_CHAR(expired_at, 'DD/MM/YYYY'),
			EXTRACT(DAY FROM expired_at - NOW())
		FROM domains
		WHERE expired_at BETWEEN NOW() AND NOW() + INTERVAL '30 day'
		ORDER BY expired_at ASC
	`)
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
