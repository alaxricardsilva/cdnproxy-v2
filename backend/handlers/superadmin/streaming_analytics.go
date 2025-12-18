package superadmin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

type StreamingHit struct {
	Time string `json:"time"`
	Hits int    `json:"hits"`
}

// StreamingHitsHandler retorna a contagem de hits por hora nas últimas 24 horas.
func StreamingHitsHandler(w http.ResponseWriter, r *http.Request) {
	// Query para agrupar hits por hora nas últimas 24h
	// Ajustado para Postgres: to_char(created_at, 'HH24:00')
	query := `
		SELECT to_char(created_at, 'HH24:00') as hour_bucket, COUNT(*) as total_hits
		FROM streaming_access_logs
		WHERE created_at >= NOW() - INTERVAL '24 hours'
		GROUP BY hour_bucket
		ORDER BY hour_bucket ASC
	`

	rows, err := database.DB.Query(context.Background(), query)
	if err != nil {
		http.Error(w, "Error fetching streaming hits: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []StreamingHit
	// Map para garantir que todas as horas apareçam, mesmo com 0 hits (opcional, mas bom para gráficos)
	// Por enquanto, vamos retornar o que tem.

	for rows.Next() {
		var hit StreamingHit
		if err := rows.Scan(&hit.Time, &hit.Hits); err != nil {
			http.Error(w, "Error scanning hits: "+err.Error(), http.StatusInternalServerError)
			return
		}
		results = append(results, hit)
	}

	// Se vazio, retorna array vazio
	if results == nil {
		results = []StreamingHit{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
