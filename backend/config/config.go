package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config struct holds all configuration for the application
type Config struct {
	DatabaseURL              string
	SupabaseURL              string
	SupabaseAPIKey           string
	SupabaseJWTSigningKey    string
	SMTPAddress              string
	SMTPPort                 string
	SMTPDomain               string
	SMTPUsername             string
	SMTPPassword             string
	MercadoPagoAccessToken   string
	MercadoPagoWebhookSecret string
}

// LoadConfig loads config from .env file and environment variables
func LoadConfig() (*Config, error) {
	// Load .env file, but it's okay if it doesn't exist (for production)
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := &Config{
		DatabaseURL:              os.Getenv("DATABASE_URL"),
		SupabaseURL:              os.Getenv("SUPABASE_URL"),
		SupabaseAPIKey:           os.Getenv("SUPABASE_API_KEY"),
		SupabaseJWTSigningKey:    os.Getenv("SUPABASE_JWT_SIGNING_KEY"),
		SMTPAddress:              os.Getenv("SMTP_ADDRESS"),
		SMTPPort:                 os.Getenv("SMTP_PORT"),
		SMTPDomain:               os.Getenv("SMTP_DOMAIN"),
		SMTPUsername:             os.Getenv("SMTP_USERNAME"),
		SMTPPassword:             os.Getenv("SMTP_PASSWORD"),
		MercadoPagoAccessToken:   os.Getenv("MERCADOPAGO_ACCESS_TOKEN"),
		MercadoPagoWebhookSecret: os.Getenv("MERCADOPAGO_WEBHOOK_SECRET"),
	}

	return cfg, nil
}
