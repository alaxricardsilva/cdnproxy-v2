package admin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/models"
	"CDNProxy_v2/backend/services/mercadopago"

	"github.com/jackc/pgtype"
)

// CheckoutRequest is empty now as we pull from Cart
type CheckoutRequest struct{}

func CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int64)

	// Fetch User
	var user models.User
	err := database.DB.QueryRow(r.Context(), "SELECT id, email, name FROM public.users WHERE id = $1", userID).Scan(&user.ID, &user.Email, &user.Name)
	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// Fetch Cart Items
	rows, err := database.DB.Query(r.Context(), "SELECT id, product_type, product_identifier, price FROM public.cart_items WHERE user_id = $1", userID)
	if err != nil {
		http.Error(w, "Failed to fetch cart items", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var cartItems []models.CartItem
	var mpItems []mercadopago.Item
	var totalAmount float64

	for rows.Next() {
		var item models.CartItem
		if err := rows.Scan(&item.ID, &item.ProductType, &item.ProductIdentifier, &item.Price); err != nil {
			http.Error(w, "Failed to scan cart item", http.StatusInternalServerError)
			return
		}
		cartItems = append(cartItems, item)

		mpItems = append(mpItems, mercadopago.Item{
			ID:         fmt.Sprintf("ITEM-%d", item.ID),
			Title:      fmt.Sprintf("%s - %s", item.ProductType, item.ProductIdentifier),
			Quantity:   1,
			CurrencyID: "BRL",
			UnitPrice:  item.Price,
		})
		totalAmount += item.Price
	}

	if len(cartItems) == 0 {
		http.Error(w, "Cart is empty", http.StatusBadRequest)
		return
	}

	// Get Frontend URL
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://app.cdnproxy.top"
	}

	// Create Payment Record (Pending)
	// We store the cart items snapshot in metadata to process later in webhook
	cartJSON, _ := json.Marshal(cartItems)
	metadata := pgtype.JSONB{}
	metadata.Set(cartJSON)

	var paymentID int64
	err = database.DB.QueryRow(r.Context(),
		"INSERT INTO public.payments (user_id, amount, status, payment_method, metadata, created_at, updated_at) VALUES ($1, $2, 'pending', 'mercadopago', $3, NOW(), NOW()) RETURNING id",
		userID, totalAmount, metadata).Scan(&paymentID)

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create payment record: %v", err), http.StatusInternalServerError)
		return
	}

	// Call MP Service
	mpService := mercadopago.NewService()

	// We need to modify CreatePreference to accept list of items and external reference = paymentID
	pref, err := mpService.CreatePreferenceFromItems(mpItems, user, frontendURL, strconv.FormatInt(paymentID, 10))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create checkout preference: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url":         pref.InitPoint,
		"sandbox_url": pref.SandboxInitPoint,
	})
}
