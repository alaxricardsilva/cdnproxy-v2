package streaming

import (
	"encoding/json"
	"net/http"
	"time"

	"CDNProxy_v2/backend/models"

	cache "github.com/patrickmn/go-cache"
)

// geoCache é um cache para armazenar os resultados da geolocalização.
var geoCache = cache.New(24*time.Hour, 25*time.Hour)

// GeolocationHandler busca a geolocalização de um IP, usando cache e múltiplos provedores.
func GeolocationHandler(w http.ResponseWriter, r *http.Request) {
	ip := r.URL.Query().Get("ip")
	if ip == "" {
		http.Error(w, "IP address is required", http.StatusBadRequest)
		return
	}

	// 1. Tenta obter do cache
	if geo, found := geoCache.Get(ip); found {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(geo)
		return
	}

	// 2. Se não estiver no cache, busca nos provedores
	geo, err := GetGeolocationFromProviders(ip)
	if err != nil {
		http.Error(w, err.Error(), http.StatusServiceUnavailable)
		return
	}

	// 3. Armazena no cache e retorna
	geoCache.Set(ip, geo, cache.DefaultExpiration)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(geo)
}

// GetGeolocationFromProviders tenta obter a geolocalização de uma lista de provedores.
// Esta função é exportada para que possa ser usada pelo ProxyHandler.
func GetGeolocationFromProviders(ip string) (*models.Geolocation, error) {
	providers := []func(string) (*models.Geolocation, error){
		getFromIPAPI,
		getFromFreeGeoIP,
	}

	for _, provider := range providers {
		if geo, err := provider(ip); err == nil {
			return geo, nil
		}
	}

	return nil, http.ErrServerClosed // Retorna um erro genérico se todos falharem
}

// --- Provedores de Geolocalização ---

func getFromIPAPI(ip string) (*models.Geolocation, error) {
	resp, err := http.Get("http://ip-api.com/json/" + ip)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Status      string  `json:"status"`
		Country     string  `json:"country"`
		CountryCode string  `json:"countryCode"`
		City        string  `json:"city"`
		Lat         float64 `json:"lat"`
		Lon         float64 `json:"lon"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if result.Status != "success" {
		return nil, http.ErrServerClosed
	}

	return &models.Geolocation{
		IP:          ip,
		CountryCode: result.CountryCode,
		CountryName: result.Country,
		City:        result.City,
		Latitude:    result.Lat,
		Longitude:   result.Lon,
	}, nil
}

func getFromFreeGeoIP(ip string) (*models.Geolocation, error) {
	resp, err := http.Get("https://freegeoip.app/json/" + ip)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result models.Geolocation
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}
