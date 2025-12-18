package superadmin

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"

	"CDNProxy_v2/backend/config"
)

type MailRequest struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Text    string `json:"text"`
	HTML    string `json:"html"`
}

func MailHandler(w http.ResponseWriter, r *http.Request) {
	var req MailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	cfg, err := config.LoadConfig()
	if err != nil {
		http.Error(w, "Failed to load config", http.StatusInternalServerError)
		return
	}

	auth := smtp.PlainAuth("", cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPAddress)

	var msg []byte
	if req.HTML != "" {
		msg = []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\nMIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n%s", req.To, req.Subject, req.HTML))
	} else {
		msg = []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s", req.To, req.Subject, req.Text))
	}

	// Establish a TLS connection
	tlsconfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: cfg.SMTPAddress,
	}

	conn, err := tls.Dial("tcp", cfg.SMTPAddress+":"+cfg.SMTPPort, tlsconfig)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to dial TLS: %v", err), http.StatusInternalServerError)
		return
	}

	client, err := smtp.NewClient(conn, cfg.SMTPAddress)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create SMTP client: %v", err), http.StatusInternalServerError)
		return
	}

	if err = client.Auth(auth); err != nil {
		http.Error(w, fmt.Sprintf("Failed to authenticate: %v", err), http.StatusInternalServerError)
		return
	}

	if err = client.Mail(cfg.SMTPUsername); err != nil {
		http.Error(w, fmt.Sprintf("Failed to set sender: %v", err), http.StatusInternalServerError)
		return
	}

	if err = client.Rcpt(req.To); err != nil {
		http.Error(w, fmt.Sprintf("Failed to set recipient: %v", err), http.StatusInternalServerError)
		return
	}

	wc, err := client.Data()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get data writer: %v", err), http.StatusInternalServerError)
		return
	}

	_, err = wc.Write(msg)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to write message: %v", err), http.StatusInternalServerError)
		return
	}

	err = wc.Close()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to close writer: %v", err), http.StatusInternalServerError)
		return
	}

	client.Quit()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
