package superadmin

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"CDNProxy_v2/backend/database"
)

// DeviceStats representa as estatísticas de um dispositivo/browser
type DeviceStats struct {
	Device string `json:"device"`
	Count  int    `json:"count"`
}

func DeviceStatsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Query simplificada para agrupar por User-Agent (Exemplo básico, idealmente usaria um parser de UA)
	// Como não temos parser de UA nativo, vamos fazer uma busca simples por keywords
	rows, err := database.DB.Query(context.Background(), `
		SELECT user_agent, COUNT(*) 
		FROM streaming_access_logs 
		GROUP BY user_agent 
		ORDER BY COUNT(*) DESC 
		LIMIT 100
	`)
	if err != nil {
		http.Error(w, "Failed to query device stats", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Mapa para agrupar resultados processados
	stats := make(map[string]int)

	for rows.Next() {
		var ua string
		var count int
		if err := rows.Scan(&ua, &count); err != nil {
			continue
		}

		// Detecção básica
		uaLower := strings.ToLower(ua)
		device := "Outros"
		if strings.Contains(uaLower, "android") {
			device = "Android"
		} else if strings.Contains(uaLower, "iphone") || strings.Contains(uaLower, "ipad") {
			device = "iOS"
		} else if strings.Contains(uaLower, "windows") {
			device = "Windows"
		} else if strings.Contains(uaLower, "macintosh") || strings.Contains(uaLower, "mac os") {
			device = "Mac OS"
		} else if strings.Contains(uaLower, "linux") {
			device = "Linux"
		}

		stats[device] += count
	}

	var response []DeviceStats
	for k, v := range stats {
		response = append(response, DeviceStats{Device: k, Count: v})
	}

	json.NewEncoder(w).Encode(response)
}
