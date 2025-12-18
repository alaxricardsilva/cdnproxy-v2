package cloudflare

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"CDNProxy_v2/backend/database"
)

const BaseURL = "https://api.cloudflare.com/client/v4"

type Service struct {
	Client *http.Client
}

func NewService() *Service {
	return &Service{
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Structs for API interaction
type Zone struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Plan   struct {
		Name string `json:"name"`
	} `json:"plan"`
	NameServers []string `json:"name_servers"`
}

type ListZonesResponse struct {
	Result  []Zone `json:"result"`
	Success bool   `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

type CreateZoneRequest struct {
	Name    string `json:"name"`
	Account struct {
		ID string `json:"id"`
	} `json:"account"`
	JumpStart bool   `json:"jump_start"`
	Type      string `json:"type"` // "full"
}

type CreateZoneResponse struct {
	Result  Zone `json:"result"`
	Success bool `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// Credentials helpers
func (s *Service) getCredentials() (string, string, error) {
	var apiKey, email string
	err := database.DB.QueryRow(context.Background(), "SELECT value FROM general_configs WHERE key = 'cloudflare_api_key'").Scan(&apiKey)
	if err != nil {
		return "", "", fmt.Errorf("missing cloudflare_api_key")
	}
	err = database.DB.QueryRow(context.Background(), "SELECT value FROM general_configs WHERE key = 'cloudflare_email'").Scan(&email)
	if err != nil {
		return "", "", fmt.Errorf("missing cloudflare_email")
	}
	return apiKey, email, nil
}

// ListZones lists all zones for the account
func (s *Service) ListZones() ([]Zone, error) {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("GET", fmt.Sprintf("%s/zones?per_page=50", BaseURL), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cloudflare api error: %d", resp.StatusCode)
	}

	var payload ListZonesResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if !payload.Success {
		if len(payload.Errors) > 0 {
			return nil, fmt.Errorf("%s", payload.Errors[0].Message)
		}
		return nil, fmt.Errorf("unknown cloudflare error")
	}

	return payload.Result, nil
}

// CreateZone adds a new domain to Cloudflare
// Note: Requires Account ID. For simple setups, "account" object might be optional or inferred if using User Key,
// but usually API Key + Email requires designating the account if the user has access to multiple.
// For now, we will try to fetch the first account ID available via `GET /accounts` if we want to be robust,
// OR we let the user configure Account ID in settings.
// Given the simplicity, let's assume we might need to List Accounts first or try creating without it if possible (often fails).
// Let's implement a ListAccounts method internally to grab the ID automatically.
func (s *Service) ListAccounts() (string, error) {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("GET", fmt.Sprintf("%s/accounts", BaseURL), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var payload struct {
		Result []struct {
			ID string `json:"id"`
		} `json:"result"`
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}

	if payload.Success && len(payload.Result) > 0 {
		return payload.Result[0].ID, nil
	}
	return "", fmt.Errorf("no cloudflare accounts found")
}

func (s *Service) CreateZone(domain string) (*Zone, error) {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return nil, err
	}

	// Auto-detect account ID
	accountID, err := s.ListAccounts()
	if err != nil {
		return nil, fmt.Errorf("failed to get account id: %v", err)
	}

	bodyData := CreateZoneRequest{
		Name:      domain,
		JumpStart: true,
		Type:      "full",
	}
	bodyData.Account.ID = accountID

	bodyBytes, _ := json.Marshal(bodyData)
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/zones", BaseURL), bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var payload CreateZoneResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if !payload.Success {
		if len(payload.Errors) > 0 {
			// Log for debugging
			fmt.Printf("CF Error: %v\n", payload.Errors)
			return nil, fmt.Errorf("%s", payload.Errors[0].Message)
		}
		return nil, fmt.Errorf("unknown cloudflare error")
	}

	return &payload.Result, nil
}

// DNS Record Structs
type DNSRecord struct {
	ID        string `json:"id,omitempty"`
	Type      string `json:"type"`
	Name      string `json:"name"`
	Content   string `json:"content"`
	Proxiable bool   `json:"proxiable"`
	Proxied   bool   `json:"proxied"`
	TTL       int    `json:"ttl"`
	ZoneID    string `json:"zone_id,omitempty"`
	ZoneName  string `json:"zone_name,omitempty"`
}

type DNSRecordResponse struct {
	Result  DNSRecord `json:"result"`
	Success bool      `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

type ListDNSRecordsResponse struct {
	Result  []DNSRecord `json:"result"`
	Success bool        `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

type ZoneDetailsResponse struct {
	Result  Zone `json:"result"`
	Success bool `json:"success"`
	Errors  []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// GetZoneDetails retrieves details of a specific zone
func (s *Service) GetZoneDetails(zoneID string) (*Zone, error) {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("GET", fmt.Sprintf("%s/zones/%s", BaseURL, zoneID), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var payload ZoneDetailsResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if !payload.Success {
		if len(payload.Errors) > 0 {
			return nil, fmt.Errorf("%s", payload.Errors[0].Message)
		}
		return nil, fmt.Errorf("unknown cloudflare error")
	}
	return &payload.Result, nil
}

// ListDNSRecords lists all DNS records for a zone
func (s *Service) ListDNSRecords(zoneID string) ([]DNSRecord, error) {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("GET", fmt.Sprintf("%s/zones/%s/dns_records?per_page=100", BaseURL, zoneID), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var payload ListDNSRecordsResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if !payload.Success {
		if len(payload.Errors) > 0 {
			return nil, fmt.Errorf("%s", payload.Errors[0].Message)
		}
		return nil, fmt.Errorf("unknown cloudflare error")
	}
	return payload.Result, nil
}

// CreateDNSRecord creates a new DNS record
func (s *Service) CreateDNSRecord(zoneID string, record DNSRecord) (*DNSRecord, error) {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return nil, err
	}

	bodyBytes, _ := json.Marshal(record)
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/zones/%s/dns_records", BaseURL, zoneID), bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var payload DNSRecordResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if !payload.Success {
		if len(payload.Errors) > 0 {
			return nil, fmt.Errorf("%s", payload.Errors[0].Message)
		}
		return nil, fmt.Errorf("unknown cloudflare error")
	}
	return &payload.Result, nil
}

// UpdateDNSRecord updates an existing DNS record
func (s *Service) UpdateDNSRecord(zoneID, recordID string, record DNSRecord) (*DNSRecord, error) {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return nil, err
	}

	bodyBytes, _ := json.Marshal(record)
	req, err := http.NewRequest("PUT", fmt.Sprintf("%s/zones/%s/dns_records/%s", BaseURL, zoneID, recordID), bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var payload DNSRecordResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	if !payload.Success {
		if len(payload.Errors) > 0 {
			return nil, fmt.Errorf("%s", payload.Errors[0].Message)
		}
		return nil, fmt.Errorf("unknown cloudflare error")
	}
	return &payload.Result, nil
}

// DeleteDNSRecord deletes a DNS record
func (s *Service) DeleteDNSRecord(zoneID, recordID string) error {
	apiKey, email, err := s.getCredentials()
	if err != nil {
		return err
	}

	req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/zones/%s/dns_records/%s", BaseURL, zoneID, recordID), nil)
	if err != nil {
		return err
	}

	req.Header.Set("X-Auth-Key", apiKey)
	req.Header.Set("X-Auth-Email", email)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var payload struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return err
	}

	if !payload.Success {
		if len(payload.Errors) > 0 {
			return fmt.Errorf("%s", payload.Errors[0].Message)
		}
		return fmt.Errorf("unknown cloudflare error")
	}
	return nil
}
