package login

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/handlers/admin"
)

type Credentials struct {
	Email string `json:"email"`
}

func UpdatePasswordHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	type ChangePasswordRequest struct {
		Password string `json:"password"`
	}
	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceRoleKey := os.Getenv("SUPABASE_SECRET_KEY")
	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", supabaseURL, userID)

	body, _ := json.Marshal(map[string]string{"password": req.Password})
	httpReq, _ := http.NewRequest("PUT", url, bytes.NewBuffer(body)) // PUT or PATCH usually works for admin update
	httpReq.Header.Set("Authorization", "Bearer "+serviceRoleKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("apikey", serviceRoleKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, "Failed to update password in Supabase Auth", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := ioutil.ReadAll(resp.Body)
		http.Error(w, "Error from Auth provider: "+string(respBody), http.StatusInternalServerError)
		return
	}

	// Atualiza flag local (se existir essa lógica de encrypted_password)
	_, err = database.DB.Exec(context.Background(), "UPDATE public.users SET encrypted_password = $1 WHERE supabase_auth_id = $2", "CHANGED", userID)
	if err != nil {
		// Não falha a reqquiição se o banco local der erro, pois o auth principal já foi
		fmt.Printf("Warning: Failed to update local user schema: %v\n", err)
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Senha atualizada com sucesso"}`))
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	type Credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_API_KEY")
	url := fmt.Sprintf("%s/auth/v1/token?grant_type=password", supabaseURL)

	body, _ := json.Marshal(map[string]string{
		"email":    creds.Email,
		"password": creds.Password,
	})
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", supabaseKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to connect to Supabase Auth", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		http.Error(w, string(respBody), http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(respBody)
}

func MeHandler(w http.ResponseWriter, r *http.Request) {
	admin.GetProfile(w, r)
}

func RequestPasswordResetHandler(w http.ResponseWriter, r *http.Request) {
	type ResetRequest struct {
		Email string `json:"email"`
	}
	var req ResetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	// Para recover público, usa-se a API Key pública geralmente, mas como estamos no backend, podemos usar a URL de admin ou a pública.
	// A rota padrão do supabase é POST /recover

	url := fmt.Sprintf("%s/auth/v1/recover", supabaseURL)

	// Configura redirect para o frontend
	redirectURL := os.Getenv("FRONTEND_URL") + "/update-password" // Ajustar env no futuro

	body, _ := json.Marshal(map[string]string{
		"email":       req.Email,
		"redirect_to": redirectURL,
	})

	httpReq, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	// Usamos a API KEY pública para iniciar o fluxo de recuperação normal
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("apikey", os.Getenv("SUPABASE_API_KEY"))

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		http.Error(w, "Failed to connect to Supabase Auth", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := ioutil.ReadAll(resp.Body)
		http.Error(w, "Error requesting password reset: "+string(respBody), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Password reset email sent"}`))
}
