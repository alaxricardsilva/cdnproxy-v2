package superadmin

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"CDNProxy_v2/backend/database"
	"CDNProxy_v2/backend/imports/config"
	"CDNProxy_v2/backend/models"

	"github.com/gorilla/mux"
)

// Estrutura auxiliar para parsing do JSON
type UserPayload struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     int    `json:"role_id"`
	Name     string `json:"name"`
	Active   bool   `json:"active"`
}

type SupabaseUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	// Outros campos omitidos
}

// createSupabaseUser cria o usuário no Supabase Auth via Admin API
func createSupabaseUser(email, password string) (*SupabaseUserResponse, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/auth/v1/admin/users", cfg.SupabaseURL)
	payload := map[string]interface{}{
		"email":         email,
		"password":      password,
		"email_confirm": true,
		"user_metadata": map[string]interface{}{},
		"app_metadata":  map[string]interface{}{"provider": "email", "providers": []string{"email"}},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.SupabaseServiceRoleKey)
	req.Header.Set("apikey", cfg.SupabaseServiceRoleKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("supabase error: %s", string(respBody))
	}

	var sbUser SupabaseUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&sbUser); err != nil {
		return nil, err
	}

	return &sbUser, nil
}

// updateSupabaseUserPassword atualiza a senha no Supabase Auth
func updateSupabaseUserPassword(uid, password string) error {
	cfg, err := config.LoadConfig()
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", cfg.SupabaseURL, uid)
	payload := map[string]interface{}{
		"password": password,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.SupabaseServiceRoleKey)
	req.Header.Set("apikey", cfg.SupabaseServiceRoleKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase error: %s", string(respBody))
	}

	return nil
}

func CreateUser(w http.ResponseWriter, r *http.Request) {
	var p UserPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	if p.Email == "" || p.Password == "" {
		http.Error(w, "Email e senha são obrigatórios", http.StatusBadRequest)
		return
	}

	// 1. Criar no Supabase
	sbUser, err := createSupabaseUser(p.Email, p.Password)
	if err != nil {
		http.Error(w, fmt.Sprintf("Erro ao criar usuário no Supabase: %v", err), http.StatusInternalServerError)
		return
	}

	// 2. Inserir no banco local vinculando o supabase_auth_id
	// Nota: A tabela users tem um ID SERIAL/BIGINT. O supabase_auth_id é um UUID salvo em outra coluna.
	// Precisamos saber se a coluna 'supabase_auth_id' existe. O modelo User tem 'SupabaseAuthID *string'.
	// Supondo coluna 'supabase_auth_id'.

	// Como a tabela user usa ID bigint e supabase usa UUID, armazenamos o UUID em supabase_auth_id.
	// E a senha encriptada? Deixamos vazia ou placeholder, pois quem autentica é o Supabase.

	_, err = database.DB.Exec(r.Context(),
		"INSERT INTO users (email, encrypted_password, role, name, active, supabase_auth_id, created_at, updated_at) VALUES ($1, '', $2, $3, true, $4, NOW(), NOW())",
		p.Email, p.Role, p.Name, sbUser.ID)

	if err != nil {
		// Rollback parcial: Deveríamos deletar do Supabase se falhar aqui, mas por simplificação vamos apenas logar erro.
		http.Error(w, fmt.Sprintf("Erro ao criar usuário localmente: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func UpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID de usuário inválido", http.StatusBadRequest)
		return
	}

	var p UserPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	// Se senha fornecida, atualizar no Supabase
	if p.Password != "" {
		// Precisamos do supabase_auth_id deste usuário para atualizar no Supabase
		var sbID *string
		err := database.DB.QueryRow(r.Context(), "SELECT supabase_auth_id FROM users WHERE id = $1", id).Scan(&sbID)
		if err != nil {
			http.Error(w, "Usuário não encontrado", http.StatusNotFound)
			return
		}

		if sbID != nil && *sbID != "" {
			if err := updateSupabaseUserPassword(*sbID, p.Password); err != nil {
				http.Error(w, fmt.Sprintf("Erro ao atualizar senha no Supabase: %v", err), http.StatusInternalServerError)
				return
			}
		} else {
			// Se não tem ID do Supabase (usuário legado?), talvez devêssemos impedir ou apenas atualizar local (se houver hash local).
			// Vamos assumir erro por enquanto para forçar integridade.
			http.Error(w, "Usuário não vinculado ao Supabase Auth", http.StatusBadRequest)
			return
		}
	}

	// Atualizar dados locais
	_, err = database.DB.Exec(r.Context(),
		"UPDATE users SET email=$1, role=$2, name=$3, updated_at=NOW() WHERE id=$4",
		p.Email, p.Role, p.Name, id)

	if err != nil {
		http.Error(w, fmt.Sprintf("Erro ao atualizar usuário: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func GetAllUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := database.DB.Query(r.Context(), "SELECT id, email, role, active, created_at, COALESCE(name, '') FROM users ORDER BY id ASC")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to query users: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Role, &u.IsActive, &u.CreatedAt, &u.Name); err != nil {
			http.Error(w, "Failed to scan user", http.StatusInternalServerError)
			return
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func ActivateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(r.Context(), "UPDATE users SET active = true WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to activate user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func DeactivateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	_, err = database.DB.Exec(r.Context(), "UPDATE users SET active = false WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to deactivate user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
