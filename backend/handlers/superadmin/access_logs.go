package superadmin

import (
	"encoding/json"
	"net/http"
	"time"

	"CDNProxy_v2/backend/database"
)

// AccessLogSummary representa o resumo dos acessos agrupados por IP
type AccessLogSummary struct {
	ClientIP    string    `json:"client_ip"`
	Hits        int       `json:"hits"`
	CountryName string    `json:"country_name"`
	City        string    `json:"city"`
	DeviceType  string    `json:"device_type"`
	LastSeen    time.Time `json:"last_seen"`
}

// GetAccessLogsHandler retorna os logs de acesso mais recentes agrupados por IP
func GetAccessLogsHandler(w http.ResponseWriter, r *http.Request) {
	// Query para agrupar por IP e pegar o último acesso e contagem
	// Limitando aos top 100 mais ativos/recentes para performance inicial
	query := `
		SELECT 
			client_ip, 
			COUNT(*) as hits, 
			MAX(country_name) as country_name, 
			MAX(city) as city,
			MAX(device_type) as device_type,
			MAX(created_at) as last_seen
		FROM streaming_access_logs
		GROUP BY client_ip
		ORDER BY last_seen DESC
		LIMIT 100
	`

	rows, err := database.DB.Query(r.Context(), query)
	if err != nil {
		http.Error(w, "Error fetching access logs: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var logs []AccessLogSummary
	for rows.Next() {
		var log AccessLogSummary
		// Trata NULLs potenciais com Scan seguro se necessário, mas MAX() geralmente ignora NULLs
		// Se city/country forem string vazias no banco, virão vazias aqui
		var countryName, city, deviceType *string 
		
		if err := rows.Scan(&log.ClientIP, &log.Hits, &countryName, &city, &deviceType, &log.LastSeen); err != nil {
			http.Error(w, "Error scanning logs: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if countryName != nil { log.CountryName = *countryName }
		if city != nil { log.City = *city }
		if deviceType != nil { log.DeviceType = *deviceType }
		
		logs = append(logs, log)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
