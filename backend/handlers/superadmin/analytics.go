package superadmin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

// AnalyticsData holds the aggregated analytics information.
type AnalyticsData struct {
	TotalUsers    int     `json:"total_users"`
	TotalPayments int     `json:"total_payments"`
	TotalRevenue  float64 `json:"total_revenue"`
}

// AnalyticsHandler handles the request for analytics data.
func AnalyticsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var data AnalyticsData
	var err error

	// Get total users
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM public.users").Scan(&data.TotalUsers)
	if err != nil {
		http.Error(w, "Failed to query total users", http.StatusInternalServerError)
		return
	}

	// Get total payments and revenue
	// Using COALESCE to handle cases where the table is empty and SUM(amount) would be NULL.
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM payments").Scan(&data.TotalPayments, &data.TotalRevenue)
	if err != nil {
		http.Error(w, "Failed to query payment analytics", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(data)
}
