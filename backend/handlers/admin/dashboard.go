package admin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
)

// DashboardHandler é o manipulador para a rota do dashboard do admin.
func DashboardHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	var totalDomains, expiringDomains, totalTransactions int
	var totalSpent float64

	// Get total domains
	err := database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM public.domains WHERE user_id = $1", userID).Scan(&totalDomains)
	if err != nil {
		http.Error(w, "Failed to query total domains", http.StatusInternalServerError)
		return
	}

	// Get expiring domains (in the next 30 days)
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM public.domains WHERE user_id = $1 AND expired_at BETWEEN NOW() AND NOW() + INTERVAL '30 day'", userID).Scan(&expiringDomains)
	if err != nil {
		http.Error(w, "Failed to query expiring domains", http.StatusInternalServerError)
		return
	}

	// Get total transactions
	err = database.DB.QueryRow(context.Background(), "SELECT COUNT(*) FROM public.payments WHERE user_id = $1", userID).Scan(&totalTransactions)
	if err != nil {
		http.Error(w, "Failed to query total transactions", http.StatusInternalServerError)
		return
	}

	// Get total spent
	err = database.DB.QueryRow(context.Background(), "SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE user_id = $1", userID).Scan(&totalSpent)
	if err != nil {
		http.Error(w, "Failed to query total spent", http.StatusInternalServerError)
		return
	}

	data := map[string]interface{}{
		"total_domains":      totalDomains,
		"expiring_domains":   expiringDomains,
		"total_transactions": totalTransactions,
		"total_spent":        totalSpent,
	}

	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}
