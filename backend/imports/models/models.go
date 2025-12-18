package models

import "time"

// User representa a estrutura da tabela 'users'.
type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Plan representa a estrutura da tabela 'plans'.
type Plan struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	Price         float64   `json:"price"`
	RequestsLimit int       `json:"requests_limit"`
	DomainsLimit  int       `json:"domains_limit"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Domain representa a estrutura da tabela 'domains'.
type Domain struct {
	ID        int       `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	PlanID    int       `json:"plan_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Traffic representa a estrutura da tabela 'traffic'.
type Traffic struct {
	ID            int       `json:"id"`
	DomainID      int       `json:"domain_id"`
	RequestsCount int       `json:"requests_count"`
	Date          time.Time `json:"date"`
	CreatedAt     time.Time `json:"created_at"`
}

// Payment representa a estrutura da tabela 'payments'.
type Payment struct {
	ID                int       `json:"id"`
	UserID            string    `json:"user_id"`
	PlanID            int       `json:"plan_id"`
	Amount            float64   `json:"amount"`
	Status            string    `json:"status"`
	PaymentGatewayID  string    `json:"payment_gateway_id"`
	CreatedAt         time.Time `json:"created_at"`
}
