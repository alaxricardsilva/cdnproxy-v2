package superadmin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

// DashboardHandler é o manipulador para a rota do dashboard do superadmin.
func DashboardHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var totalUsers, totalDomains, totalTransactions int
	var totalRevenue float64

	// Get total users
	err := database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM public.users").Scan(&totalUsers)
	if err != nil {
		http.Error(w, "Failed to query total users", http.StatusInternalServerError)
		return
	}

	// Get total domains
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM public.domains").Scan(&totalDomains)
	if err != nil {
		http.Error(w, "Failed to query total domains", http.StatusInternalServerError)
		return
	}

	// Get total transactions
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM public.payments").Scan(&totalTransactions)
	if err != nil {
		http.Error(w, "Failed to query total transactions", http.StatusInternalServerError)
		return
	}

	// Get total revenue (only from successful payments)
	err = database.DB.QueryRow(context.Background(), "SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'paid'").Scan(&totalRevenue)
	if err != nil {
		http.Error(w, "Failed to query total revenue", http.StatusInternalServerError)
		return
	}

	data := map[string]interface{}{
		"total_users":        totalUsers,
		"total_domains":      totalDomains,
		"total_transactions": totalTransactions,
		"total_revenue":      totalRevenue,
	}

	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
