package superadmin

import (
	"context"
	"encoding/json"
	"net/http"

	"CDNProxy_v2/backend/database"
)

type TableStatus struct {
	Name string `json:"name"`
	Rows int64  `json:"rows"`
	Size string `json:"size"`
}

type DatabaseStatusResponse struct {
	DatabaseSize      string        `json:"database_size"`
	ActiveConnections int           `json:"active_connections"`
	Tables            []TableStatus `json:"tables"`
}

type DatabaseCleanRequest struct {
	Tables []string `json:"tables"`
}

func DatabaseStatusHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Get Database Size
	// 1. Get Public Schema Size
	var dbSize *string
	err := database.DB.QueryRow(context.Background(), "SELECT pg_size_pretty(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname)))) FROM pg_stat_user_tables WHERE schemaname = 'public'").Scan(&dbSize)
	if err != nil || dbSize == nil {
		defaultSize := "0 B"
		dbSize = &defaultSize
	}

	finalSize := *dbSize

	// 2. Get Active Connections
	var activeConnections int
	err = database.DB.QueryRow(context.Background(), "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'").Scan(&activeConnections)
	if err != nil {
		activeConnections = 0
	}

	// 3. Get Tables Info (Name, Rows, Size)
	rows, err := database.DB.Query(context.Background(), `
        SELECT 
            relname as table_name, 
            n_live_tup as rows, 
            pg_size_pretty(pg_total_relation_size(relid)) as size 
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
    `)
	if err != nil {
		http.Error(w, "Failed to list tables", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tables []TableStatus
	for rows.Next() {
		var t TableStatus
		if err := rows.Scan(&t.Name, &t.Rows, &t.Size); err != nil {
			continue
		}
		tables = append(tables, t)
	}

	resp := DatabaseStatusResponse{
		DatabaseSize:      finalSize,
		ActiveConnections: activeConnections,
		Tables:            tables,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func DatabaseCleanHandler(w http.ResponseWriter, r *http.Request) {
	var req DatabaseCleanRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	allowed := map[string]string{
		"daily_traffics":        "DELETE FROM daily_traffics",
		"monthly_traffic":       "DELETE FROM monthly_traffic",
		"streaming_access_logs": "DELETE FROM streaming_access_logs",
		"streaming_proxies":     "DELETE FROM streaming_proxies",
		"cart_items":            "DELETE FROM cart_items",
	}

	if len(req.Tables) == 0 {
		req.Tables = []string{"daily_traffics", "monthly_traffic"}
	}

	for _, table := range req.Tables {
		query, ok := allowed[table]
		if !ok {
			continue
		}

		if _, err := database.DB.Exec(r.Context(), query); err != nil {
			http.Error(w, "Failed to clean tables", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
