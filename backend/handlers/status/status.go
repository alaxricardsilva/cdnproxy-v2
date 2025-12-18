package status

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"CDNProxy_v2/backend/database"
)

// StatusResponse define a estrutura da resposta da rota de status.
type StatusResponse struct {
	Status               string `json:"status"`
	DatabaseConnected    bool   `json:"database_connected"`
	DatabaseLatencyMS    int64  `json:"database_latency_ms"`
	InternetConnectivity bool   `json:"internet_connectivity"`
}

// StatusHandler verifica e retorna o status do sistema.
func StatusHandler(w http.ResponseWriter, r *http.Request) {
	dbLatency, dbConnected := checkDatabase(r.Context())
	internetConnected := checkInternetConnectivity()

	response := StatusResponse{
		Status:               "ok",
		DatabaseConnected:    dbConnected,
		DatabaseLatencyMS:    dbLatency,
		InternetConnectivity: internetConnected,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// checkDatabase mede a latência e a conectividade com o banco de dados.
func checkDatabase(ctx context.Context) (latency int64, connected bool) {
	start := time.Now()
	err := database.DB.Ping(ctx)
	if err != nil {
		return 0, false
	}
	latency = time.Since(start).Milliseconds()
	return latency, true
}

// checkInternetConnectivity verifica a conectividade com a internet.
func checkInternetConnectivity() bool {
	client := http.Client{
		Timeout: 5 * time.Second, // Define um timeout para a requisição
	}
	resp, err := client.Get("https://www.google.com")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}
