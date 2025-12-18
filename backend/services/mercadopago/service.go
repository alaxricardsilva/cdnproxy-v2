package mercadopago

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/models"
)

const BaseURL = "https://api.mercadopago.com"

type Service struct {
	Client *http.Client
}

func NewService() *Service {
	return &Service{
		Client: &http.Client{},
	}
}

// Structs for Preference
type PreferenceRequest struct {
	Items             []Item    `json:"items"`
	Payer             *Payer    `json:"payer,omitempty"`
	BackUrls          *BackUrls `json:"back_urls,omitempty"`
	AutoReturn        string    `json:"auto_return,omitempty"`
	ExternalReference string    `json:"external_reference,omitempty"`
}

type Item struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description string  `json:"description,omitempty"`
	Quantity    int     `json:"quantity"`
	CurrencyID  string  `json:"currency_id"`
	UnitPrice   float64 `json:"unit_price"`
}

type Payer struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
}

type BackUrls struct {
	Success string `json:"success,omitempty"`
	Failure string `json:"failure,omitempty"`
	Pending string `json:"pending,omitempty"`
}

type PreferenceResponse struct {
	ID               string `json:"id"`
	InitPoint        string `json:"init_point"`
	SandboxInitPoint string `json:"sandbox_init_point"`
}

func (s *Service) getAccessToken() (string, error) {
	var token string
	err := database.DB.QueryRow(context.Background(), "SELECT value FROM general_configs WHERE key = 'MERCADOPAGO_ACCESS_TOKEN'").Scan(&token)
	if err != nil {
		return "", fmt.Errorf("missing MERCADOPAGO_ACCESS_TOKEN")
	}
	return token, nil
}

func (s *Service) CreatePreference(plan models.Plan, user models.User, frontendURL string) (*PreferenceResponse, error) {
	token, err := s.getAccessToken()
	if err != nil {
		return nil, err
	}

	reqBody := PreferenceRequest{
		Items: []Item{
			{
				ID:          fmt.Sprintf("PLAN-%d", plan.ID),
				Title:       plan.Name,
				Description: *plan.Description,
				Quantity:    1,
				CurrencyID:  "BRL",
				UnitPrice:   plan.Price,
			},
		},
		Payer: &Payer{
			// Name field might require splitting user.Name, skipping for simplicity or if strictly needed
			Email: user.Email,
		},
		BackUrls: &BackUrls{
			Success: fmt.Sprintf("%s/admin/billing?status=success", frontendURL),
			Failure: fmt.Sprintf("%s/admin/billing?status=failure", frontendURL),
			Pending: fmt.Sprintf("%s/admin/billing?status=pending", frontendURL),
		},
		AutoReturn:        "approved",
		ExternalReference: fmt.Sprintf("USER-%d|PLAN-%d", user.ID, plan.ID),
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/checkout/preferences", BaseURL), bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return nil, fmt.Errorf("mercadopago api error: %d - %v", resp.StatusCode, errResp)
	}

	var result PreferenceResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

type PaymentResponse struct {
	ID                int64   `json:"id"`
	Status            string  `json:"status"`
	StatusDetail      string  `json:"status_detail"`
	ExternalReference string  `json:"external_reference"`
	TransactionAmount float64 `json:"transaction_amount"`
}

func (s *Service) GetPayment(paymentID string) (*PaymentResponse, error) {
	token, err := s.getAccessToken()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("GET", fmt.Sprintf("%s/v1/payments/%s", BaseURL, paymentID), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get payment: %d", resp.StatusCode)
	}

	var result PaymentResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *Service) CreatePreferenceFromItems(items []Item, user models.User, frontendURL string, externalRef string) (*PreferenceResponse, error) {
	token, err := s.getAccessToken()
	if err != nil {
		return nil, err
	}

	payerName := ""
	if user.Name != nil {
		payerName = *user.Name
	}

	reqBody := PreferenceRequest{
		Items: items,
		Payer: &Payer{
			Name:  payerName,
			Email: user.Email,
		},
		BackUrls: &BackUrls{
			Success: fmt.Sprintf("%s/admin/cart?status=success", frontendURL),
			Failure: fmt.Sprintf("%s/admin/cart?status=failure", frontendURL),
			Pending: fmt.Sprintf("%s/admin/cart?status=pending", frontendURL),
		},
		AutoReturn:        "approved",
		ExternalReference: externalRef,
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/checkout/preferences", BaseURL), bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errResp)
		return nil, fmt.Errorf("mercadopago api error: %d - %v", resp.StatusCode, errResp)
	}

	var result PreferenceResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}
