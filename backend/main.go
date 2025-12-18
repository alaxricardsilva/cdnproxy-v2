package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"CDNProxy_v2/backend/config"
	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/handlers/admin"
	"CDNProxy_v2/backend/handlers/login"
	"CDNProxy_v2/backend/handlers/public"
	"CDNProxy_v2/backend/handlers/status"
	"CDNProxy_v2/backend/handlers/streaming"
	"CDNProxy_v2/backend/handlers/superadmin"
	"CDNProxy_v2/backend/handlers/webhook"
	"CDNProxy_v2/backend/middleware"

	"github.com/gorilla/mux"
)

func main() {
	// Define o fuso horário global da aplicação
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		log.Fatalf("Could not set timezone: %v", err)
	}
	time.Local = loc
	// Carrega a configuração no início
	_, err = config.LoadConfig()
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	// Conecta ao banco de dados
	database.ConnectDB()
	defer database.CloseDB()

	// Roda as migrações
	database.RunMigrations()

	// Cria um novo roteador com gorilla/mux
	r := mux.NewRouter()

	// Rota de Status
	r.HandleFunc("/api/status", status.StatusHandler).Methods("GET")

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if strings.Contains(host, ":") {
			host = strings.Split(host, ":")[0]
		}

		if host == "localhost" || host == "127.0.0.1" ||
			strings.HasPrefix(host, "app.") || strings.HasPrefix(host, "api.") {
			fmt.Fprintf(w, "API CDN Proxy Online! - Status:200")
			return
		}

		streaming.DomainProxyHandler(w, r)
	})
	r.HandleFunc("/auth", login.LoginHandler).Methods("POST")
	r.HandleFunc("/auth/recover", login.RequestPasswordResetHandler).Methods("POST")
	r.Handle("/api/auth/me", middleware.SupabaseAuth(http.HandlerFunc(login.MeHandler))).Methods("GET")
	r.Handle("/api/auth/update_password", middleware.SupabaseAuth(http.HandlerFunc(login.UpdatePasswordHandler))).Methods("PUT", "POST")

	streamingRouter := r.PathPrefix("/api/streaming").Subrouter()
	streamingRouter.HandleFunc("/proxy", streaming.ProxyHandler).Methods("GET", "POST")
	streamingRouter.HandleFunc("/geolocation", streaming.GeolocationHandler).Methods("GET")
	// A rota utils/geolocation_original é mapeada para o mesmo handler
	utilsRouter := r.PathPrefix("/api/utils").Subrouter()
	utilsRouter.HandleFunc("/geolocation_original", streaming.GeolocationHandler).Methods("GET")

	// Rota Pública de Configuração (Logo, Favicon, Nome)
	r.HandleFunc("/api/public/config", public.GetPublicConfig).Methods("GET")

	// Rotas de Checkout e Webhook
	r.HandleFunc("/api/webhook/mercadopago", webhook.HandleWebhook).Methods("POST")

	// --- ROTAS DE ADMIN ---
	adminRouter := r.PathPrefix("/api/admin").Subrouter()
	adminRouter.Use(middleware.SupabaseAuth, middleware.RoleAuthorization("2"))
	adminRouter.HandleFunc("/dashboard", admin.DashboardHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/dashboard/data", admin.DashboardDataHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/dashboard/traffic", admin.TrafficChartHandler).Methods("GET", "OPTIONS") // New route
	adminRouter.HandleFunc("/domains", admin.GetUserDomains).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/domains/{id}", admin.UpdateUserDomain).Methods("PUT", "OPTIONS")
	adminRouter.HandleFunc("/domains/{id}", admin.DeleteUserDomain).Methods("DELETE", "OPTIONS")
	adminRouter.HandleFunc("/cart", admin.CartHandler).Methods("GET", "POST", "PUT", "DELETE")
	adminRouter.HandleFunc("/transactions", admin.TransactionsHandler).Methods("GET")
	// Novas rotas de domínio para Admin
	adminRouter.HandleFunc("/domains", admin.GetUserDomains).Methods("GET")
	adminRouter.HandleFunc("/domains/{id}", admin.UpdateUserDomain).Methods("PUT")

	// Profile routes
	adminRouter.HandleFunc("/profile", admin.GetProfile).Methods("GET")
	adminRouter.HandleFunc("/profile", admin.UpdateProfile).Methods("PUT")

	// --- ROTAS DE SUPER ADMIN ---
	superAdminRouter := r.PathPrefix("/api/superadmin").Subrouter()
	superAdminRouter.Use(middleware.SupabaseAuth, middleware.RoleAuthorization("1"))
	superAdminRouter.HandleFunc("/dashboard", superadmin.DashboardHandler).Methods("GET")
	superAdminRouter.HandleFunc("/dashboard/data", superadmin.DashboardDataHandler).Methods("GET")
	superAdminRouter.HandleFunc("/database/status", superadmin.DatabaseStatusHandler).Methods("GET")
	superAdminRouter.HandleFunc("/database/clean", superadmin.DatabaseCleanHandler).Methods("POST")
	superAdminRouter.HandleFunc("/payments", superadmin.PaymentsHandler).Methods("GET", "POST")
	superAdminRouter.HandleFunc("/payments/{id}", superadmin.PaymentHandler).Methods("GET", "PUT", "DELETE")
	superAdminRouter.HandleFunc("/mail", superadmin.MailHandler).Methods("POST")
	superAdminRouter.HandleFunc("/cloudflare/config", superadmin.CloudflareConfigHandler).Methods("GET", "PUT")
	superAdminRouter.HandleFunc("/cloudflare/zones", superadmin.ListZonesHandler).Methods("GET")
	superAdminRouter.HandleFunc("/cloudflare/zones", superadmin.CreateZoneHandler).Methods("POST")
	superAdminRouter.HandleFunc("/cloudflare/zones/{id}", superadmin.GetZoneDetailsHandler).Methods("GET")
	superAdminRouter.HandleFunc("/cloudflare/zones/{id}/dns_records", superadmin.ListDNSRecordsHandler).Methods("GET")
	superAdminRouter.HandleFunc("/cloudflare/zones/{id}/dns_records", superadmin.CreateDNSRecordHandler).Methods("POST")
	superAdminRouter.HandleFunc("/cloudflare/zones/{id}/dns_records/{record_id}", superadmin.UpdateDNSRecordHandler).Methods("PUT")
	superAdminRouter.HandleFunc("/cloudflare/zones/{id}/dns_records/{record_id}", superadmin.DeleteDNSRecordHandler).Methods("DELETE")
	superAdminRouter.HandleFunc("/configuration", superadmin.ConfigurationHandler).Methods("GET", "PUT")
	superAdminRouter.HandleFunc("/general_config", superadmin.GeneralConfigHandler).Methods("GET", "POST", "PUT", "DELETE")
	superAdminRouter.HandleFunc("/analytics", superadmin.AnalyticsHandler).Methods("GET")
	superAdminRouter.HandleFunc("/analytics/devices", superadmin.DeviceStatsHandler).Methods("GET")
	superAdminRouter.HandleFunc("/analytics/streaming-hits", superadmin.StreamingHitsHandler).Methods("GET")

	// Plans
	superAdminRouter.HandleFunc("/plans", superadmin.GetAllPlans).Methods("GET")
	superAdminRouter.HandleFunc("/plans", superadmin.CreatePlan).Methods("POST")
	superAdminRouter.HandleFunc("/plans/{id}", superadmin.GetPlan).Methods("GET")
	superAdminRouter.HandleFunc("/plans/{id}", superadmin.UpdatePlan).Methods("PUT")
	superAdminRouter.HandleFunc("/plans/{id}", superadmin.DeletePlan).Methods("DELETE")
	superAdminRouter.HandleFunc("/mercadopago", superadmin.MercadoPagoHandler).Methods("GET", "POST")
	superAdminRouter.HandleFunc("/dashboard/traffic-chart", superadmin.TrafficChartHandler).Methods("GET")
	superAdminRouter.HandleFunc("/access-logs", superadmin.GetAccessLogsHandler).Methods("GET") // Nova rota de Monitoring
	// Novas rotas de domínio para Super Admin
	superAdminRouter.HandleFunc("/domains", superadmin.GetAllDomains).Methods("GET")
	superAdminRouter.HandleFunc("/domains", superadmin.CreateDomain).Methods("POST")
	superAdminRouter.HandleFunc("/domains/{id}", superadmin.GetDomain).Methods("GET")
	superAdminRouter.HandleFunc("/domains/{id}", superadmin.UpdateDomain).Methods("PUT")
	superAdminRouter.HandleFunc("/domains/{id}", superadmin.DeleteDomain).Methods("DELETE")
	superAdminRouter.HandleFunc("/domains/{id}/renew", superadmin.RenewDomain).Methods("POST")
	superAdminRouter.HandleFunc("/domains/{id}/activate", superadmin.ActivateDomain).Methods("POST")
	superAdminRouter.HandleFunc("/domains/{id}/deactivate", superadmin.DeactivateDomain).Methods("POST")

	// User management routes
	superAdminRouter.HandleFunc("/users", superadmin.GetAllUsers).Methods("GET")
	superAdminRouter.HandleFunc("/users", superadmin.CreateUser).Methods("POST")
	superAdminRouter.HandleFunc("/users/{id}", superadmin.UpdateUser).Methods("PUT")
	superAdminRouter.HandleFunc("/users/{id}/activate", superadmin.ActivateUser).Methods("POST")
	superAdminRouter.HandleFunc("/users/{id}/deactivate", superadmin.DeactivateUser).Methods("POST")

	// Traffic routes
	superAdminRouter.HandleFunc("/traffic", superadmin.GetAllTraffic).Methods("GET")
	superAdminRouter.HandleFunc("/traffic/{id}", superadmin.GetTraffic).Methods("GET")
	superAdminRouter.HandleFunc("/traffic/reset", superadmin.ResetTrafficHandler).Methods("POST")

	r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if strings.Contains(host, ":") {
			host = strings.Split(host, ":")[0]
		}

		if host == "localhost" || host == "127.0.0.1" ||
			strings.HasPrefix(host, "app.") || strings.HasPrefix(host, "api.") {
			http.NotFound(w, r)
			return
		}

		streaming.DomainProxyHandler(w, r)
	})

	log.Println("Servidor Go iniciado na porta :8080")
	if err := http.ListenAndServe(":8080", middleware.CORSMiddleware(r)); err != nil {
		log.Fatal(err)
	}
}
