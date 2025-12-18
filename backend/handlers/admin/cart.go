package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/middleware"
)

type CartItem struct {
	ID                int64   `json:"id"`
	UserID            int64   `json:"user_id"`
	ProductType       string  `json:"product_type"`
	ProductIdentifier string  `json:"product_identifier"`
	Price             float64 `json:"price"`
}

func CartHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		getCartItems(w, r)
	case http.MethodPost:
		addCartItem(w, r)
	case http.MethodDelete:
		deleteCartItem(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getCartItems(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	rows, err := database.DB.Query(context.Background(), "SELECT id, user_id, product_type, product_identifier, price FROM public.cart_items WHERE user_id = $1", userID)
	if err != nil {
		http.Error(w, "Failed to query cart items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []CartItem
	for rows.Next() {
		var item CartItem
		if err := rows.Scan(&item.ID, &item.UserID, &item.ProductType, &item.ProductIdentifier, &item.Price); err != nil {
			http.Error(w, "Failed to scan cart item", http.StatusInternalServerError)
			return
		}
		items = append(items, item)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(items)
}

func addCartItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	var item CartItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Forçar o user_id do token para segurança
	item.UserID = userID

	// Sever-side price validation
	if item.ProductType == "domain_renewal" {
		// Converter ProductIdentifier (Domain ID) para int
		domainID, err := strconv.Atoi(item.ProductIdentifier)
		if err != nil {
			http.Error(w, "Invalid domain ID", http.StatusBadRequest)
			return
		}

		// Buscar o preço do plano associado ao domínio
		var planPrice float64
		query := `
			SELECT COALESCE(p.price, 0)
			FROM domains d
			JOIN plans p ON d.plan_id = p.id
			WHERE d.id = $1 AND d.user_id = $2
		`
		err = database.DB.QueryRow(context.Background(), query, domainID, userID).Scan(&planPrice)
		if err != nil {
			http.Error(w, "Domain or Plan not found", http.StatusNotFound)
			return
		}

		item.Price = planPrice
	}
	// Se houver outros tipos de produto, adicionar lógica aqui ou manter o preço do payload (se confiável)

	_, err := database.DB.Exec(context.Background(),
		"INSERT INTO public.cart_items (user_id, product_type, product_identifier, price) VALUES ($1, $2, $3, $4)",
		item.UserID, item.ProductType, item.ProductIdentifier, item.Price)
	if err != nil {
		http.Error(w, "Failed to add item to cart", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Item added to cart successfully"})
}

func deleteCartItem(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int64)
	if !ok {
		http.Error(w, "Invalid user ID in token", http.StatusUnauthorized)
		return
	}

	var body struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	cmdTag, err := database.DB.Exec(context.Background(), "DELETE FROM public.cart_items WHERE id = $1 AND user_id = $2", body.ID, userID)
	if err != nil {
		http.Error(w, "Failed to delete item from cart", http.StatusInternalServerError)
		return
	}

	if cmdTag.RowsAffected() == 0 {
		http.Error(w, "Item not found or you don't have permission to delete it", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Item deleted from cart successfully"})
}
