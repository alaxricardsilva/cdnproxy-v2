package models

import (
	"time"

	"github.com/jackc/pgtype"
)

type User struct {
	ID                  int64      `json:"id"`
	Email               string     `json:"email"`
	EncryptedPassword   string     `json:"encrypted_password"`
	ResetPasswordToken  *string    `json:"reset_password_token"`
	ResetPasswordSentAt *time.Time `json:"reset_password_sent_at"`
	RememberCreatedAt   *time.Time `json:"remember_created_at"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	Role                int        `json:"role"`
	Name                *string    `json:"name"`
	Active              *bool      `json:"active"`
	PasswordDigest      *string    `json:"password_digest"`
	SupabaseAuthID      *string    `json:"supabase_auth_id"`
	IsActive            bool       `json:"is_active"`
}

type CartItem struct {
	ID                int64     `json:"id"`
	UserID            int64     `json:"user_id"`
	ProductType       string    `json:"product_type"`
	ProductIdentifier string    `json:"product_identifier"`
	Price             float64   `json:"price"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Cart struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	ProductID *int      `json:"product_id"`
	Quantity  *int      `json:"quantity"`
	Price     *float64  `json:"price"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CloudflareConfig struct {
	ID        int64     `json:"id"`
	ZoneID    *string   `json:"zone_id"`
	APIToken  *string   `json:"api_token"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type DailyTraffic struct {
	ID        int64      `json:"id"`
	Date      *time.Time `json:"date"`
	Trafego   *int       `json:"trafego"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type DashboardData struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	DataType  *string   `json:"data_type"`
	DataValue *string   `json:"data_value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Domain struct {
	ID         int64     `json:"id"`
	Name       string    `json:"name"`
	Dominio    string    `json:"dominio"`
	TargetURL  string    `json:"target_url"`
	UserID     int64     `json:"user_id"`
	PlanID     int64     `json:"plan_id"`
	ExpiredAt  time.Time `json:"expired_at"`
	Active     *bool     `json:"active"`
	DomainType string    `json:"domain_type"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type GeneralConfig struct {
	ID        int       `json:"id"`
	Key       string    `json:"key"`
	Value     *string   `json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type MercadopagoNotification struct {
	ID        int64         `json:"id"`
	Payload   *pgtype.JSONB `json:"payload"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

type MercadopagoTransaction struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"user_id"`
	Amount        float64   `json:"amount"`
	Status        *string   `json:"status"`
	TransactionID *string   `json:"transaction_id"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type MonthlyTraffic struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Download  *int      `json:"download"`
	Upload    *int      `json:"upload"`
	Bandwidth *int      `json:"bandwidth"`
	Requests  *int      `json:"requests"`
	Month     int       `json:"month"`
	Year      int       `json:"year"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Payment struct {
	ID            int64         `json:"id"`
	UserID        int64         `json:"user_id"`
	PlanID        int64         `json:"plan_id"`
	Amount        float64       `json:"amount"`
	Status        *string       `json:"status"`
	PaymentMethod *string       `json:"payment_method"`
	PaidAt        *time.Time    `json:"paid_at"`
	Metadata      *pgtype.JSONB `json:"metadata"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type PixTransaction struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Amount    float64   `json:"amount"`
	Status    *string   `json:"status"`
	PixKey    *string   `json:"pix_key"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Plan struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Price       float64   `json:"price"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Profile struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Bio       *string   `json:"bio"`
	AvatarURL *string   `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type StreamingAccessLog struct {
	ID               int       `json:"id"`
	StreamingProxyID int       `json:"streaming_proxy_id"`
	ClientIP         *string   `json:"client_ip"`
	UserAgent        *string   `json:"user_agent"`
	DeviceType       *string   `json:"device_type"`
	CountryCode      *string   `json:"country_code"`
	CountryName      *string   `json:"country_name"`
	City             *string   `json:"city"`
	Latitude         *float64  `json:"latitude"`
	Longitude        *float64  `json:"longitude"`
	CreatedAt        time.Time `json:"created_at"`
}

type StreamingProxy struct {
	ID        int64     `json:"id"`
	DomainID  int64     `json:"domain_id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Status    string    `json:"status"`
	ProxyURL  string    `json:"proxy_url"`
	Active    *bool     `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
