package database

import (
	"CDNProxy_v2/backend/config"
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

// ConnectDB estabelece a conexão com o banco de dados.
func ConnectDB() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Não foi possível carregar a configuração para o banco de dados: %v", err)
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatalf("Não foi possível conectar ao banco de dados: %v", err)
	}

	DB = pool
	log.Println("Conexão com o banco de dados estabelecida com sucesso.")
}

// CloseDB fecha a conexão com o banco de dados.
func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("Conexão com o banco de dados fechada.")
	}
}

// RunMigrations executa as migrações do banco de dados para criar as tabelas necessárias.
func RunMigrations() {
	schemas := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			name VARCHAR(255),
			email VARCHAR(255) UNIQUE,
			password VARCHAR(255),
			role VARCHAR(50) DEFAULT 'user',
			active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS plans (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			price NUMERIC(10, 2) NOT NULL,
			requests_limit INT NOT NULL,
			domains_limit INT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS domains (
			id SERIAL PRIMARY KEY,
			user_id UUID REFERENCES users(id),
			name VARCHAR(255) UNIQUE NOT NULL,
			plan_id INT REFERENCES plans(id),
			expires_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS traffic (
			id SERIAL PRIMARY KEY,
			domain_id INT REFERENCES domains(id),
			requests_count INT NOT NULL,
			date DATE NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS payments (
			id SERIAL PRIMARY KEY,
			user_id UUID REFERENCES users(id),
			plan_id INT REFERENCES plans(id),
			amount NUMERIC(10, 2) NOT NULL,
			status VARCHAR(50) NOT NULL,
			payment_gateway_id VARCHAR(255),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
	}

	for _, schema := range schemas {
		_, err := DB.Exec(context.Background(), schema)
		if err != nil {
			log.Fatalf("Erro ao executar migração: %v\nSchema:\n%s", err, schema)
		}
	}

	log.Println("Migrações do banco de dados executadas com sucesso.")
}
