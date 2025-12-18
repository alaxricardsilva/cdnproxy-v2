package config

import (
	"os"

	"github.com/joho/godotenv"
)

// Config armazena todas as configurações da aplicação.
type Config struct {
	SupabaseURL            string
	SupabaseAPIKey         string
	SupabaseServiceRoleKey string
	SupabaseJwtSigningKey  string
	DBHost                 string
	DBPort                 string
	DBUser                 string
	DBPassword             string
	DBName                 string
}

// LoadConfig carrega as configurações do arquivo .env.
func LoadConfig() (*Config, error) {
	err := godotenv.Load()
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		SupabaseURL:            os.Getenv("SUPABASE_URL"),
		SupabaseAPIKey:         os.Getenv("SUPABASE_API_KEY"),
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		SupabaseJwtSigningKey:  os.Getenv("SUPABASE_JWT_SIGNING_KEY"),
		DBHost:                 os.Getenv("DB_HOST"),
		DBPort:                 os.Getenv("DB_PORT"),
		DBUser:                 os.Getenv("DB_USER"),
		DBPassword:             os.Getenv("DB_PASSWORD"),
		DBName:                 os.Getenv("DB_NAME"),
	}

	return cfg, nil
}
