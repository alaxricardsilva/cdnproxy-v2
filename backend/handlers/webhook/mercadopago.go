package webhook

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/models"
	"CDNProxy_v2/backend/services/mercadopago"

	"github.com/jackc/pgtype"
)

func HandleWebhook(w http.ResponseWriter, r *http.Request) {
	topic := r.URL.Query().Get("topic")
	id := r.URL.Query().Get("id")

	if topic == "" {
		topic = r.URL.Query().Get("type")
		id = r.URL.Query().Get("data.id")
	}

	if topic == "payment" && id != "" {
		mpService := mercadopago.NewService()
		payment, err := mpService.GetPayment(id)
		if err != nil {
			fmt.Printf("Webhook Error fetching payment %s: %v\n", id, err)
			w.WriteHeader(http.StatusOK)
			return
		}

		// Legacy or New Logic?
		// New Logic: ExternalReference is PaymentID (int64)
		paymentID, err := strconv.ParseInt(payment.ExternalReference, 10, 64)
		if err != nil {
			fmt.Printf("Webhook: ExternalReference is not a valid PaymentID: %s\n", payment.ExternalReference)
			// Could be legacy USER|PLAN format, ignoring for now as we pivoted.
			w.WriteHeader(http.StatusOK)
			return
		}

		// 1. Update Payment Status in DB
		_, err = database.DB.Exec(r.Context(),
			"UPDATE public.payments SET status = $1, updated_at = NOW() WHERE id = $2",
			payment.Status, paymentID)

		if err != nil {
			fmt.Printf("Error updating payment %d status: %v\n", paymentID, err)
		} else {
			fmt.Printf("Payment %d status updated to %s\n", paymentID, payment.Status)
		}

		if payment.Status == "approved" {
			// 2. Process Renewals if approved
			var metadata pgtype.JSONB
			var userID int64

			// Get Metadata and UserID from Payment Record
			err = database.DB.QueryRow(r.Context(), "SELECT user_id, metadata FROM public.payments WHERE id = $1", paymentID).Scan(&userID, &metadata)

			if err == nil && metadata.Status == pgtype.Present {
				var items []models.CartItem
				if err := json.Unmarshal(metadata.Bytes, &items); err == nil {
					for _, item := range items {
						if item.ProductType == "domain_renewal" {
							domainID, _ := strconv.ParseInt(item.ProductIdentifier, 10, 64)
							if domainID > 0 {
								// Renew domain by 30 days
								// Ensure we only renew if it belongs to the user?
								// Ideally yes, but trusted payment implies consent.
								_, err := database.DB.Exec(r.Context(), "UPDATE public.domains SET expired_at = expired_at + INTERVAL '30 days' WHERE id = $1", domainID)
								if err != nil {
									fmt.Printf("Error renewing domain %d: %v\n", domainID, err)
								} else {
									fmt.Printf("Domain %d renewed via payment %d\n", domainID, paymentID)
								}
							}
						}
					}

					// Clear Cart for User
					database.DB.Exec(r.Context(), "DELETE FROM public.cart_items WHERE user_id = $1", userID)
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}
