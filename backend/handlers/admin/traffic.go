package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
)

// AdminDailyTraffic struct for JSON response
type AdminDailyTraffic struct {
	Date  string `json:"date"`
	Count int    `json:"trafego"` // Keep 'trafego' key to match frontend expectation (count treated as "units" generic)
}

// TrafficChartHandler fetches aggregated daily hits for the logged-in user's domains
func TrafficChartHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get User ID from Context
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	thirtyDaysAgo := time.Now().Add(-30 * 24 * time.Hour)

	// Query: Join streaming_access_logs -> streaming_proxies -> domains
	// Filter by domains.user_id
	query := `
		SELECT 
			TO_CHAR(sal.created_at, 'YYYY-MM-DD') as day, 
			COUNT(*) as hits
		FROM streaming_access_logs sal
		JOIN streaming_proxies sp ON sal.streaming_proxy_id = sp.id
		JOIN domains d ON sp.domain_id = d.id
		WHERE d.user_id = $1 AND sal.created_at >= $2
		GROUP BY day
		ORDER BY day ASC
	`

	rows, err := database.DB.Query(context.Background(), query, userID, thirtyDaysAgo)
	if err != nil {
		http.Error(w, "Error fetching user traffic: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []AdminDailyTraffic
	for rows.Next() {
		var t AdminDailyTraffic
		if err := rows.Scan(&t.Date, &t.Count); err != nil {
			http.Error(w, "Error scanning user traffic: "+err.Error(), http.StatusInternalServerError)
			return
		}
		results = append(results, t)
	}

	// Helper to ensure we return an empty array [] instead of null if no data
	if results == nil {
		results = []AdminDailyTraffic{}
	}

	if err := json.NewEncoder(w).Encode(results); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
