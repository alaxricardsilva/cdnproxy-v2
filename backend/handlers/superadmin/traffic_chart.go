package superadmin

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"CDNProxy_v2/backend/database"
)

// DailyTraffic representa os dados de tráfego para um único dia.
type DailyTraffic struct {
	Date    string  `json:"date"`
	Trafego float64 `json:"trafego"`
}

// TrafficChartHandler busca e retorna os dados para o gráfico de tráfego do superadmin.
// Por padrão, busca os dados dos últimos 30 dias.
func TrafficChartHandler(w http.ResponseWriter, r *http.Request) {
	thirtyDaysAgo := time.Now().Add(-30 * 24 * time.Hour)

	query := `
		SELECT TO_CHAR(date, 'DD/MM/YYYY'), trafego
		FROM daily_traffics
		WHERE date >= $1
		ORDER BY date ASC`

	rows, err := database.DB.Query(context.Background(), query, thirtyDaysAgo)
	if err != nil {
		http.Error(w, "Error fetching daily traffic: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []DailyTraffic
	for rows.Next() {
		var traffic DailyTraffic
		if err := rows.Scan(&traffic.Date, &traffic.Trafego); err != nil {
			http.Error(w, "Error scanning daily traffic: "+err.Error(), http.StatusInternalServerError)
			return
		}
		results = append(results, traffic)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
