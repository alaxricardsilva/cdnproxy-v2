package database

import (
	"context"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"sort"

	"CDNProxy_v2/backend/config"

	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DB holds the database connection pool

var DB *pgxpool.Pool

// ConnectDB connects to the database and sets up the connection pool

func ConnectDB() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Não foi possível carregar a configuração para conexão com o banco de dados: %v\n", err)
	}

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL não está definida nas variáveis de ambiente")
	}

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Não foi possível criar o pool de conexões: %v\n", err)
	}

	DB = pool
	log.Println("Conexão com o banco de dados estabelecida com sucesso.")
}

// tableExists checks if a table exists in the public schema.
func tableExists(tableName string) bool {
	var exists bool
	err := DB.QueryRow(context.Background(), `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = $1
		)`, tableName).Scan(&exists)
	if err != nil {
		log.Printf("Erro ao verificar se a tabela %s existe: %v", tableName, err)
		return false
	}
	return exists
}

// RunMigrations reads and executes SQL migration files from the migrations directory
func RunMigrations() {
	migrationsDir := "/www/wwwroot/CDNProxy_v2/backend/database/migrations"
	files, err := ioutil.ReadDir(migrationsDir)
	if err != nil {
		log.Fatalf("Não foi possível ler o diretório de migrações: %v", err)
	}
	sort.Slice(files, func(i, j int) bool {
		return files[i].Name() < files[j].Name()
	})

	usersTableExists := tableExists("users")

	for _, file := range files {
		if file.Name() == "001_drop_incorrect_users_table.sql" {
			continue // Pula a migração que causa o problema
		}

		if file.Name() == "002_create_legacy_users_table.sql" && usersTableExists {
			log.Printf("Skipping migration %s because table 'users' already exists.", file.Name())
			continue
		}

		if filepath.Ext(file.Name()) == ".sql" {
			log.Printf("Executando migração: %s", file.Name())
			filePath := filepath.Join(migrationsDir, file.Name())
			sqlBytes, err := ioutil.ReadFile(filePath)
			if err != nil {
				log.Fatalf("Não foi possível ler o arquivo de migração %s: %v", file.Name(), err)
			}

			_, err = DB.Exec(context.Background(), string(sqlBytes))
			if err != nil {
				log.Fatalf("Falha ao executar a migração %s: %v", file.Name(), err)
			}
		}
	}
	log.Println("Migrações concluídas com sucesso.")
}

// CloseDB closes the database connection pool

func CloseDB() {
	if DB != nil {
		fmt.Println("Pool de conexões com o banco de dados fechado.")
		DB.Close()
		log.Println("Pool de conexões fechado.")
	}
}
