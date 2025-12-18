package superadmin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

// MercadoPagoHandler handles GET and POST requests for Mercado Pago configurations.
func MercadoPagoHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		getMercadoPagoConfigs(w, r)
	case http.MethodPost:
		updateMercadoPagoConfigs(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getMercadoPagoConfigs(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query(context.Background(), "SELECT key, value FROM public.general_configs WHERE key LIKE 'MERCADOPAGO_%'")
	if err != nil {
		http.Error(w, "Failed to query Mercado Pago configs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	configs := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			http.Error(w, "Failed to scan Mercado Pago config", http.StatusInternalServerError)
			return
		}
		configs[key] = value
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error iterating over Mercado Pago configs", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(configs)
}

func updateMercadoPagoConfigs(w http.ResponseWriter, r *http.Request) {
	var configs map[string]string
	if err := json.NewDecoder(r.Body).Decode(&configs); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	tx, err := database.DB.Begin(context.Background())
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background()) // Rollback in case of error

	for key, value := range configs {
		// Ensure we are only updating Mercado Pago keys
		if !isMercadoPagoKey(key) {
			continue // Or return an error
		}
		_, err := tx.Exec(context.Background(),
			`INSERT INTO public.general_configs (key, value, updated_at) VALUES ($1, $2, NOW())
			 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
			key, value)
		if err != nil {
			http.Error(w, "Failed to update Mercado Pago config", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(context.Background()); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Mercado Pago configurations updated successfully"})
}

// isMercadoPagoKey checks if the key is a valid Mercado Pago configuration key.
func isMercadoPagoKey(key string) bool {
	switch key {
	case "MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_PUBLIC_KEY", "MERCADOPAGO_CLIENT_ID", "MERCADOPAGO_CLIENT_SECRET", "MERCADOPAGO_WEBHOOK_URL":
		return true
	default:
		return false
	}
}
