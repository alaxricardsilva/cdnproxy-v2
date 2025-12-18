package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
)

type Payment struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Amount    float64   `json:"amount"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func TransactionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	rows, err := database.DB.Query(context.Background(), "SELECT id, user_id, amount, status, created_at, updated_at FROM public.payments WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		http.Error(w, "Failed to query transactions", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var transactions []Payment
	for rows.Next() {
		var p Payment
		if err := rows.Scan(&p.ID, &p.UserID, &p.Amount, &p.Status, &p.CreatedAt, &p.UpdatedAt); err != nil {
			http.Error(w, "Failed to scan transaction", http.StatusInternalServerError)
			return
		}
		transactions = append(transactions, p)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error iterating over transactions", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(transactions)
}
