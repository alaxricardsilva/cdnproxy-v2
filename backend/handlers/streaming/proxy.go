package streaming

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/models"

	"github.com/jackc/pgx/v5"
)

// ProxyRequest define a estrutura esperada no corpo da requisição para o proxy.
type ProxyRequest struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type countingResponseWriter struct {
	http.ResponseWriter
	bytes int64
}

func (w *countingResponseWriter) Write(b []byte) (int, error) {
	n, err := w.ResponseWriter.Write(b)
	w.bytes += int64(n)
	return n, err
}

func ProxyHandler(w http.ResponseWriter, r *http.Request) {
	var req ProxyRequest
	if r.Method == http.MethodGet {
		req.Name = r.URL.Query().Get("name")
		req.Path = r.URL.Query().Get("path")
	} else {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	handleProxy(w, r, req)
}

func DomainProxyHandler(w http.ResponseWriter, r *http.Request) {
	host := r.Host
	if host == "" {
		http.NotFound(w, r)
		return
	}

	if strings.Contains(host, ":") {
		host = strings.Split(host, ":")[0]
	}

	path := r.URL.RequestURI()
	if path == "" {
		path = "/"
	}

	req := ProxyRequest{
		Name: host,
		Path: path,
	}

	handleProxy(w, r, req)
}

func handleProxy(w http.ResponseWriter, r *http.Request, req ProxyRequest) {
	if req.Name == "" {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(browserStatusPage()))
			return
		}
		http.Error(w, "Missing name parameter", http.StatusBadRequest)
		return
	}

	clientIP := getClientIP(r)
	userAgent := r.Header.Get("User-Agent")

	var stream struct {
		ID       int64
		UserID   int64
		ProxyURL string
	}

	err := database.DB.QueryRow(
		r.Context(),
		"SELECT sp.id, d.user_id, sp.proxy_url FROM streaming_proxies sp JOIN domains d ON sp.domain_id = d.id WHERE d.dominio = $1 AND sp.active = TRUE",
		req.Name,
	).Scan(&stream.ID, &stream.UserID, &stream.ProxyURL)

	if err != nil {
		var domainID int64
		var userID int64
		var targetURL string

		errDomain := database.DB.QueryRow(
			r.Context(),
			"SELECT id, user_id, target_url FROM domains WHERE dominio = $1",
			req.Name,
		).Scan(&domainID, &userID, &targetURL)
		if errDomain != nil || targetURL == "" {
			// Se não encontrou o domínio e for um navegador, mostra a página de "Acesso Negado"
			if isBrowser(userAgent) {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusNotFound)
				_, _ = w.Write([]byte(browserStatusPage()))
				return
			}

			http.Error(w, "Proxy configuration not found", http.StatusNotFound)
			return
		}

		errProxy := database.DB.QueryRow(
			r.Context(),
			"INSERT INTO streaming_proxies (domain_id, proxy_url, active, created_at, updated_at) VALUES ($1, $2, TRUE, NOW(), NOW()) RETURNING id",
			domainID,
			targetURL,
		).Scan(&stream.ID)
		if errProxy != nil {
			http.Error(w, "Failed to create proxy configuration", http.StatusInternalServerError)
			return
		}

		stream.UserID = userID
		stream.ProxyURL = targetURL
	}

	if isBrowser(userAgent) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(browserStatusPage()))
		return
	}

	targetURL, err := url.Parse(stream.ProxyURL)
	if err != nil {
		http.Error(w, "Invalid target URL in proxy configuration", http.StatusInternalServerError)
		return
	}

	cw := &countingResponseWriter{ResponseWriter: w}

	go createStreamingAccessLog(r.Context(), stream.ID, clientIP, userAgent)
	go updateDailyTraffic(r.Context())

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	upstreamPath := req.Path
	upstreamQuery := ""
	if u, err := url.Parse(req.Path); err == nil {
		upstreamPath = u.Path
		upstreamQuery = u.RawQuery
	}

	fallbackURL := *targetURL
	fallbackURL.Path = upstreamPath
	fallbackURL.RawQuery = upstreamQuery

	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, proxyErr error) {
		http.Redirect(rw, req, fallbackURL.String(), http.StatusMovedPermanently)
	}

	r.URL.Path = upstreamPath
	r.URL.RawQuery = upstreamQuery
	r.URL.Host = targetURL.Host
	r.URL.Scheme = targetURL.Scheme
	r.Header.Set("X-Forwarded-Host", r.Header.Get("Host"))
	r.Host = targetURL.Host

	proxy.ServeHTTP(cw, r)

	if stream.UserID != 0 && cw.bytes > 0 {
		downloadBytes := cw.bytes
		uploadBytes := int64(0)
		bandwidthBytes := downloadBytes
		go updateMonthlyTraffic(r.Context(), stream.UserID, downloadBytes, uploadBytes, bandwidthBytes)
	}
}

// createStreamingAccessLog busca a geolocalização e salva o log de acesso no banco de dados.
func createStreamingAccessLog(ctx context.Context, proxyID int64, clientIP, userAgent string) {
	// 1. Bot Filtering: Se for robô, ignora
	uaLower := strings.ToLower(userAgent)
	fmt.Printf("[DEBUG] Access from IP: %s | UA: %s\n", clientIP, userAgent)

	if strings.Contains(uaLower, "bot") || strings.Contains(uaLower, "crawler") ||
		strings.Contains(uaLower, "spider") || strings.Contains(uaLower, "curl") ||
		strings.Contains(uaLower, "wget") || strings.Contains(uaLower, "slurp") ||
		strings.Contains(uaLower, "mediapartners") {
		fmt.Println("[DEBUG] BLOCKED BOT")
		return
	}

	// 2. Device Detection
	deviceType := detectDeviceType(userAgent)
	fmt.Printf("[DEBUG] Detected Device: '%s'\n", deviceType)

	if deviceType == "Desconhecido" {
		fmt.Println("[DEBUG] BLOCKED UNKNOWN DEVICE")
		return // Não registrar dispositivos irreconhecíveis
	}

	geo, err := GetGeolocationFromProviders(clientIP)
	if err != nil {
		// Se a geolocalização falhar, registra o log mesmo assim, com campos nulos.
		geo = &models.Geolocation{}
	}

	_, _ = database.DB.Exec(ctx,
		"INSERT INTO streaming_access_logs (streaming_proxy_id, client_ip, user_agent, device_type, country_code, country_name, city, latitude, longitude, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
		proxyID,
		clientIP,
		userAgent,
		deviceType,
		geo.CountryCode,
		geo.CountryName,
		geo.City,
		geo.Latitude,
		geo.Longitude,
		time.Now(),
	)
}

func updateDailyTraffic(ctx context.Context) {
	today := time.Now().In(time.Local).Truncate(24 * time.Hour)

	var id int64
	var current int
	err := database.DB.QueryRow(ctx,
		"SELECT id, COALESCE(trafego, 0) FROM daily_traffics WHERE date = $1",
		today,
	).Scan(&id, &current)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			_, _ = database.DB.Exec(ctx,
				"INSERT INTO daily_traffics (date, trafego, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())",
				today,
				1,
			)
		}
		return
	}

	_, _ = database.DB.Exec(ctx,
		"UPDATE daily_traffics SET trafego = $1, updated_at = NOW() WHERE id = $2",
		current+1,
		id,
	)
}

func updateMonthlyTraffic(ctx context.Context, userID int64, download, upload, bandwidth int64) {
	now := time.Now().In(time.Local)
	month := int(now.Month())
	year := now.Year()

	_, _ = database.DB.Exec(ctx,
		"DELETE FROM monthly_traffic WHERE month <> $1 OR year <> $2",
		month,
		year,
	)

	var id int64
	err := database.DB.QueryRow(ctx,
		"SELECT id FROM monthly_traffic WHERE user_id = $1 AND month = $2 AND year = $3",
		userID,
		month,
		year,
	).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			_, _ = database.DB.Exec(ctx,
				"INSERT INTO monthly_traffic (user_id, download, upload, bandwidth, requests, month, year, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())",
				userID,
				download,
				upload,
				bandwidth,
				1,
				month,
				year,
			)
		}
		return
	}

	_, _ = database.DB.Exec(ctx,
		"UPDATE monthly_traffic SET download = download + $1, upload = upload + $2, bandwidth = bandwidth + $3, requests = requests + 1, updated_at = NOW() WHERE id = $4",
		download,
		upload,
		bandwidth,
		id,
	)
}

// getClientIP extrai o IP real do cliente, considerando proxies.
func getClientIP(r *http.Request) string {
	if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
		return ip
	}

	if ip := r.Header.Get("True-Client-IP"); ip != "" {
		return ip
	}

	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		parts := strings.Split(ip, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}

	return strings.Split(r.RemoteAddr, ":")[0]
}

// isBrowser verifica se o User-Agent pertence a um navegador comum.
func isBrowser(userAgent string) bool {
	ua := strings.ToLower(userAgent)
	browserSignatures := []string{"mozilla", "chrome", "safari", "firefox", "edge"}
	for _, sig := range browserSignatures {
		if strings.Contains(ua, sig) {
			return true
		}
	}
	return false
}

// detectDeviceType analisa o User-Agent para determinar o tipo de dispositivo.
func detectDeviceType(userAgent string) string {
	ua := strings.ToLower(userAgent)
	switch {
	case strings.Contains(ua, "smarttv"), strings.Contains(ua, "smart-tv"), strings.Contains(ua, "hbbtv"), strings.Contains(ua, "netcast"), strings.Contains(ua, "tizen"), strings.Contains(ua, "webos"), strings.Contains(ua, "appletv"), strings.Contains(ua, "googletv"), strings.Contains(ua, "firetv"), strings.Contains(ua, "android tv"):
		return "SmartTV"
	case strings.Contains(ua, "iphone"):
		return "iPhone"
	case strings.Contains(ua, "ipad"):
		return "iPad"
	case strings.Contains(ua, "android"), strings.Contains(ua, "mobile"):
		return "Celular" // Android ou outros mobiles genéricos
	case strings.Contains(ua, "window"):
		return "Windows PC"
	case strings.Contains(ua, "macintosh"), strings.Contains(ua, "mac os"):
		return "Mac"
	case strings.Contains(ua, "linux"):
		return "Linux"
	default:
		return "Desconhecido"
	}
}

func browserStatusPage() string {
	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CDN Proxy Online</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      -ms-user-select: none;
    }
    .matrix {
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image: linear-gradient(180deg, rgba(0,255,0,0.15) 1px, transparent 1px);
      background-size: 2px 8px;
      opacity: 0.4;
      animation: rain 20s linear infinite;
    }
    @keyframes rain {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
    .container {
      position: relative;
      z-index: 2;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 24px;
    }
    .code {
      font-size: 5rem;
      font-weight: 800;
      color: #ff3737;
      text-shadow: 0 0 20px rgba(255,55,55,0.8);
      letter-spacing: 0.15em;
      animation: pulse 2.5s infinite;
    }
    .skull {
      font-size: 3rem;
      margin-bottom: 12px;
      text-shadow: 0 0 18px rgba(255,255,255,0.9);
      animation: pulse 2.5s infinite;
    }
    @keyframes pulse {
      0%,100% { text-shadow: 0 0 12px rgba(255,55,55,0.9); opacity: 1; }
      50% { text-shadow: 0 0 30px rgba(255,0,0,1); opacity: 0.8; }
    }
    .title {
      margin-top: 8px;
      font-size: 1.1rem;
      letter-spacing: 0.3em;
      color: #f97316;
    }
    .bar {
      margin-top: 24px;
      padding: 12px 32px;
      border-radius: 999px;
      border: 1px solid rgba(248,250,252,0.2);
      background: radial-gradient(circle at 0 0, rgba(248,250,252,0.16), transparent),
                  radial-gradient(circle at 100% 100%, rgba(248,250,252,0.12), transparent);
      position: relative;
      overflow: hidden;
    }
    .bar::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(248,250,252,0.6), transparent);
      transform: translateX(-100%);
      animation: shine 3s linear infinite;
    }
    @keyframes shine {
      0% { transform: translateX(-100%); }
      60%,100% { transform: translateX(100%); }
    }
    .bar-text {
      position: relative;
      font-size: 0.9rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
    .subtitle {
      margin-top: 18px;
      font-size: 0.9rem;
      color: #e5e7eb;
      opacity: 0.8;
    }
    .alert {
      margin-top: 32px;
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #facc15;
    }
    .dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 10px rgba(34,197,94,0.9);
      margin-right: 8px;
      animation: blink 1.4s infinite;
      vertical-align: middle;
    }
    @keyframes blink {
      0%,100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
    .footer {
      position: fixed;
      bottom: 16px;
      right: 20px;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: rgba(148,163,184,0.9);
    }
  </style>
</head>
<body>
  <div class="matrix"></div>
  <div class="container">
    <div class="skull">☠️</div>
    <div class="code">404</div>
    <div class="title">ACESSO NEGADO</div>
    <div class="bar">
      <div class="bar-text">TENTATIVA DE ACESSO</div>
    </div>
    <div class="subtitle">
      <span class="dot"></span>
      Seu acesso foi registrado e monitorado
    </div>
    <div class="alert">
      <div>⚠️ INTRUSÃO DETECTADA ⚠️</div>
      <div>ATIVIDADE SUSPEITA REGISTRADA</div>
      <div>TODOS OS ACESSOS SÃO MONITORADOS</div>
      <div>RICARD TECH NOTIFICADO</div>
    </div>
  </div>
  <div class="footer">
    Sistema de segurança ativo
  </div>
  <script>
    document.addEventListener("contextmenu", function(e) { e.preventDefault(); });
    document.addEventListener("copy", function(e) { e.preventDefault(); });
    document.addEventListener("cut", function(e) { e.preventDefault(); });
    document.addEventListener("paste", function(e) { e.preventDefault(); });
    document.addEventListener("keydown", function(e) {
      if ((e.ctrlKey || e.metaKey) && ["c","x","v","s","u","p","a"].indexOf(e.key.toLowerCase()) !== -1) {
        e.preventDefault();
      }
    });
  </script>
</body>
</html>`
}
