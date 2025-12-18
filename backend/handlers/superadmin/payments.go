package superadmin

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"CDNProxy_v2/backend/database"
)

// Payment represents the structure of a payment record.

type Payment struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	PlanID        int       `json:"plan_id"`
	Amount        float64   `json:"amount"`
	Status        string    `json:"status"`
	PaymentMethod string    `json:"payment_method"`
	PaidAt        time.Time `json:"paid_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// PaymentsHandler handles the request to get all payments.
func PaymentsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		rows, err := database.DB.Query(context.Background(), "SELECT id, user_id, plan_id, amount, status, payment_method, paid_at, created_at, updated_at FROM payments")
		if err != nil {
			http.Error(w, "Failed to query payments", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		payments := []Payment{}
		for rows.Next() {
			var p Payment
			if err := rows.Scan(&p.ID, &p.UserID, &p.PlanID, &p.Amount, &p.Status, &p.PaymentMethod, &p.PaidAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
				http.Error(w, "Failed to scan payment", http.StatusInternalServerError)
				return
			}
			payments = append(payments, p)
		}

		json.NewEncoder(w).Encode(payments)

	case http.MethodPost:
		var p Payment
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		err := database.DB.QueryRow(context.Background(), "INSERT INTO payments (user_id, plan_id, amount, status, payment_method, paid_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id", p.UserID, p.PlanID, p.Amount, p.Status, p.PaymentMethod, p.PaidAt).Scan(&p.ID)
		if err != nil {
			log.Printf("Failed to create payment: %v", err)
			http.Error(w, "Failed to create payment", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(p)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// PaymentHandler handles the request to get a single payment.
func PaymentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	idStr := r.URL.Path[len("/api/superadmin/payments/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid payment ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		var p Payment
		err := database.DB.QueryRow(context.Background(), "SELECT id, user_id, plan_id, amount, status, payment_method, paid_at, created_at, updated_at FROM payments WHERE id = $1", id).Scan(&p.ID, &p.UserID, &p.PlanID, &p.Amount, &p.Status, &p.PaymentMethod, &p.PaidAt, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			http.Error(w, "Payment not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(p)
	case http.MethodPut, http.MethodPatch:
		var updates map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if len(updates) == 0 {
			http.Error(w, "No update fields provided", http.StatusBadRequest)
			return
		}

		setClauses := []string{}
		args := []interface{}{}
		i := 1

		for key, value := range updates {
			if key == "id" || key == "created_at" || key == "updated_at" {
				continue
			}
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, i))
			args = append(args, value)
			i++
		}

		setClauses = append(setClauses, "updated_at = NOW()")

		query := fmt.Sprintf("UPDATE payments SET %s WHERE id = $%d", strings.Join(setClauses, ", "), i)
		args = append(args, id)

		_, err := database.DB.Exec(context.Background(), query, args...)
		if err != nil {
			log.Printf("Failed to update payment: %v. Query: %s", err, query)
			http.Error(w, "Failed to update payment", http.StatusInternalServerError)
			return
		}

		// Re-fetch the payment to return the updated data
		var updatedPayment Payment
		err = database.DB.QueryRow(context.Background(), "SELECT id, user_id, plan_id, amount, status, payment_method, paid_at, created_at, updated_at FROM payments WHERE id = $1", id).Scan(&updatedPayment.ID, &updatedPayment.UserID, &updatedPayment.PlanID, &updatedPayment.Amount, &updatedPayment.Status, &updatedPayment.PaymentMethod, &updatedPayment.PaidAt, &updatedPayment.CreatedAt, &updatedPayment.UpdatedAt)
		if err != nil {
			http.Error(w, "Failed to fetch updated payment", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(updatedPayment)
	case http.MethodDelete:
		_, err := database.DB.Exec(context.Background(), "DELETE FROM payments WHERE id = $1", id)
		if err != nil {
			http.Error(w, "Failed to delete payment", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
