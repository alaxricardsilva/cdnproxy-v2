package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"
)

type SuperAdminUser struct {
	ID int64 `json:"id"`
}

type SuperAdminPlan struct {
	ID    int64   `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

type SuperAdminDomain struct {
	ID      int64  `json:"id"`
	Name    string `json:"name"`
	Dominio string `json:"dominio"`
	UserID  int64  `json:"user_id"`
	PlanID  int64  `json:"plan_id"`
}

type SuperAdminPayment struct {
	ID int64 `json:"id"`
}

type SuperAdminTraffic struct {
	ID int64 `json:"id"`
}

func main() {
	baseURL := "http://localhost:8080"

	// Login SUPERADMIN
	superadminJWT := loginAndGetJWT(baseURL+"/auth", "alaxricardsilva@gmail.com", "Admin123")
	// Login ADMIN
	adminJWT := loginAndGetJWT(baseURL+"/auth", "alaxricardsilva@outlook.com", "Admin123")

	// Rotas públicas
	testRoute("GET", baseURL+"/api/status", "", 200)
	testRoute("GET", baseURL+"/", "", 200)
	testRoute("POST", baseURL+"/webhook/mercadopago", "", 200)

	// Rotas de streaming
	testRoute("POST", baseURL+"/api/streaming/proxy", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/streaming/geolocation?ip=8.8.8.8", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/utils/geolocation_original?ip=8.8.8.8", superadminJWT, 200)

	// Rotas ADMIN
	testAdminRoutes(baseURL, adminJWT)

	// Rotas SUPERADMIN
	testRoute("GET", baseURL+"/api/superadmin/dashboard", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/superadmin/dashboard/data", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/superadmin/database/status", superadminJWT, 200)
	testRoute("POST", baseURL+"/api/superadmin/database/clean", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/superadmin/domains", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/superadmin/users", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/superadmin/plans", superadminJWT, 200)
	testRoute("GET", baseURL+"/api/superadmin/traffic", superadminJWT, 200)

	testSuperAdminRoutes(baseURL, superadminJWT)
}

func loginAndGetJWT(url, email, password string) string {
	client := &http.Client{}
	body := map[string]string{"email": email, "password": password}
	jsonBody, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	if err != nil {
		fmt.Printf("Erro ao criar requisição de login: %v\n", err)
		return ""
	}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao fazer login: %v\n", err)
		return ""
	}
	defer resp.Body.Close()
	respBody, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		fmt.Printf("[FALHA LOGIN] %s - Esperado 200, Recebido %d, Body: %s\n", url, resp.StatusCode, string(respBody))
		return ""
	}
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	if token, ok := result["token"].(string); ok && token != "" {
		return "Bearer " + token
	}
	if accessToken, ok := result["access_token"].(string); ok && accessToken != "" {
		return "Bearer " + accessToken
	}
	fmt.Printf("[FALHA LOGIN] Token não encontrado na resposta: %s\n", string(respBody))
	return ""
}

func testAdminRoutes(baseURL, adminJWT string) {
	// Dashboard e dados agregados
	testRoute("GET", baseURL+"/api/admin/dashboard", adminJWT, 200)
	testRoute("GET", baseURL+"/api/admin/dashboard/data", adminJWT, 200)

	// Domínios do usuário e domínios próximos do vencimento
	testRoute("GET", baseURL+"/api/admin/domains", adminJWT, 200)
	testRoute("GET", baseURL+"/api/admin/domains/renewal", adminJWT, 200)

	// Perfil e transações
	testRoute("GET", baseURL+"/api/admin/profile", adminJWT, 200)
	testRoute("GET", baseURL+"/api/admin/transactions", adminJWT, 200)

	// Carrinho
	testRoute("GET", baseURL+"/api/admin/cart", adminJWT, 200)
}

func testSuperAdminRoutes(baseURL, superadminJWT string) {
	fmt.Println("==== Testes detalhados SUPERADMIN (CRUD) ====")

	userID := getFirstSuperAdminUserID(baseURL, superadminJWT)
	if userID == 0 {
		fmt.Println("Nenhum usuário disponível para testes SUPERADMIN")
		return
	}

	planID := createTestPlan(baseURL, superadminJWT)
	if planID == 0 {
		fmt.Println("Falha ao criar plano de teste SUPERADMIN")
		return
	}

	domainID := createAndUpdateTestDomain(baseURL, superadminJWT, userID, planID)
	paymentID := createAndUpdateTestPayment(baseURL, superadminJWT, userID, planID)
	testUserActivationToggle(baseURL, superadminJWT, userID)
	testSuperAdminTrafficByID(baseURL, superadminJWT)

	if paymentID != 0 {
		deleteTestPayment(baseURL, superadminJWT, paymentID)
	}
	if domainID != 0 {
		deleteTestDomain(baseURL, superadminJWT, domainID)
	}
	if planID != 0 {
		deleteTestPlan(baseURL, superadminJWT, planID)
	}
}

func getFirstSuperAdminUserID(baseURL, superadminJWT string) int64 {
	client := &http.Client{}
	req, err := http.NewRequest("GET", baseURL+"/api/superadmin/users", nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de usuários SUPERADMIN: %v\n", err)
		return 0
	}
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao buscar usuários SUPERADMIN: %v\n", err)
		return 0
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		fmt.Printf("[FALHA] GET /api/superadmin/users - Esperado 200, Recebido %d, Body: %s\n", resp.StatusCode, string(body))
		return 0
	}

	var users []SuperAdminUser
	if err := json.Unmarshal(body, &users); err != nil {
		fmt.Printf("Erro ao decodificar resposta de usuários SUPERADMIN: %v\n", err)
		return 0
	}
	if len(users) == 0 {
		fmt.Println("Lista de usuários SUPERADMIN vazia")
		return 0
	}

	return users[0].ID
}

func createTestPlan(baseURL, superadminJWT string) int64 {
	client := &http.Client{}

	name := fmt.Sprintf("TEST_PLAN_SUPERADMIN_%d", time.Now().UnixNano())
	payload := map[string]interface{}{
		"name":        name,
		"price":       99.99,
		"description": "Plano de teste SUPERADMIN",
	}
	jsonBody, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", baseURL+"/api/superadmin/plans", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Erro ao criar requisição de criação de plano: %v\n", err)
		return 0
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao criar plano SUPERADMIN: %v\n", err)
		return 0
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 201 {
		fmt.Printf("[FALHA] POST /api/superadmin/plans - Esperado 201, Recebido %d, Body: %s\n", resp.StatusCode, string(body))
		return 0
	}

	var plan SuperAdminPlan
	if err := json.Unmarshal(body, &plan); err != nil {
		fmt.Printf("Erro ao decodificar plano criado: %v\n", err)
		return 0
	}

	fmt.Printf("[OK] Plano de teste criado - ID %d\n", plan.ID)

	updatePayload := map[string]interface{}{
		"name":        plan.Name + "_EDITADO",
		"price":       plan.Price + 10,
		"description": "Plano de teste SUPERADMIN editado",
	}
	updateBody, _ := json.Marshal(updatePayload)

	updateReq, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/superadmin/plans/%d", baseURL, plan.ID), bytes.NewBuffer(updateBody))
	if err != nil {
		fmt.Printf("Erro ao criar requisição de atualização de plano: %v\n", err)
		return plan.ID
	}
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", superadminJWT)

	updateResp, err := client.Do(updateReq)
	if err != nil {
		fmt.Printf("Erro ao atualizar plano SUPERADMIN: %v\n", err)
		return plan.ID
	}
	defer updateResp.Body.Close()

	updateRespBody, _ := ioutil.ReadAll(updateResp.Body)
	if updateResp.StatusCode != 204 {
		fmt.Printf("[FALHA] PUT /api/superadmin/plans/%d - Esperado 204, Recebido %d, Body: %s\n", plan.ID, updateResp.StatusCode, string(updateRespBody))
	} else {
		fmt.Printf("[OK] Plano de teste atualizado - ID %d\n", plan.ID)
	}

	return plan.ID
}

func deleteTestPlan(baseURL, superadminJWT string, planID int64) {
	client := &http.Client{}
	req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/api/superadmin/plans/%d", baseURL, planID), nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de exclusão de plano: %v\n", err)
		return
	}
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao excluir plano SUPERADMIN: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 204 {
		fmt.Printf("[FALHA] DELETE /api/superadmin/plans/%d - Esperado 204, Recebido %d, Body: %s\n", planID, resp.StatusCode, string(body))
	} else {
		fmt.Printf("[OK] Plano de teste excluído - ID %d\n", planID)
	}
}

func createAndUpdateTestDomain(baseURL, superadminJWT string, userID, planID int64) int64 {
	client := &http.Client{}

	dominio := fmt.Sprintf("test-superadmin-%d.cdnproxy.top", time.Now().UnixNano())
	expiry := time.Now().Add(30 * 24 * time.Hour).Format(time.RFC3339)

	payload := map[string]interface{}{
		"name":       dominio,
		"dominio":    dominio,
		"user_id":    userID,
		"expired_at": expiry,
		"target_url": "http://ppwrk.sbs",
		"plan_id":    planID,
	}
	jsonBody, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", baseURL+"/api/superadmin/domains", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Erro ao criar requisição de criação de domínio: %v\n", err)
		return 0
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao criar domínio SUPERADMIN: %v\n", err)
		return 0
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 201 {
		fmt.Printf("[FALHA] POST /api/superadmin/domains - Esperado 201, Recebido %d, Body: %s\n", resp.StatusCode, string(body))
		return 0
	}

	fmt.Printf("[OK] Domínio de teste criado - dominio %s\n", dominio)

	getReq, err := http.NewRequest("GET", baseURL+"/api/superadmin/domains", nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de listagem de domínios: %v\n", err)
		return 0
	}
	getReq.Header.Set("Authorization", superadminJWT)

	getResp, err := client.Do(getReq)
	if err != nil {
		fmt.Printf("Erro ao listar domínios SUPERADMIN: %v\n", err)
		return 0
	}
	defer getResp.Body.Close()

	getBody, _ := ioutil.ReadAll(getResp.Body)
	if getResp.StatusCode != 200 {
		fmt.Printf("[FALHA] GET /api/superadmin/domains - Esperado 200, Recebido %d, Body: %s\n", getResp.StatusCode, string(getBody))
		return 0
	}

	var domains []SuperAdminDomain
	if err := json.Unmarshal(getBody, &domains); err != nil {
		fmt.Printf("Erro ao decodificar lista de domínios: %v\n", err)
		return 0
	}

	var domainID int64
	for _, d := range domains {
		if d.Dominio == dominio {
			domainID = d.ID
			break
		}
	}

	if domainID == 0 {
		fmt.Println("Não foi possível localizar o domínio de teste criado")
		return 0
	}

	updatePayload := map[string]interface{}{
		"name":       dominio,
		"dominio":    dominio,
		"user_id":    userID,
		"target_url": "http://ppwrk.sbs/atualizado",
		"plan_id":    planID,
	}
	updateBody, _ := json.Marshal(updatePayload)

	updateReq, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/superadmin/domains/%d", baseURL, domainID), bytes.NewBuffer(updateBody))
	if err != nil {
		fmt.Printf("Erro ao criar requisição de atualização de domínio: %v\n", err)
		return domainID
	}
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", superadminJWT)

	updateResp, err := client.Do(updateReq)
	if err != nil {
		fmt.Printf("Erro ao atualizar domínio SUPERADMIN: %v\n", err)
		return domainID
	}
	defer updateResp.Body.Close()

	updateRespBody, _ := ioutil.ReadAll(updateResp.Body)
	if updateResp.StatusCode != 204 {
		fmt.Printf("[FALHA] PUT /api/superadmin/domains/%d - Esperado 204, Recebido %d, Body: %s\n", domainID, updateResp.StatusCode, string(updateRespBody))
	} else {
		fmt.Printf("[OK] Domínio de teste atualizado - ID %d\n", domainID)
	}

	return domainID
}

func deleteTestDomain(baseURL, superadminJWT string, domainID int64) {
	client := &http.Client{}
	req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/api/superadmin/domains/%d", baseURL, domainID), nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de exclusão de domínio: %v\n", err)
		return
	}
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao excluir domínio SUPERADMIN: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 204 {
		fmt.Printf("[FALHA] DELETE /api/superadmin/domains/%d - Esperado 204, Recebido %d, Body: %s\n", domainID, resp.StatusCode, string(body))
	} else {
		fmt.Printf("[OK] Domínio de teste excluído - ID %d\n", domainID)
	}
}

func createAndUpdateTestPayment(baseURL, superadminJWT string, userID, planID int64) int64 {
	client := &http.Client{}

	payload := map[string]interface{}{
		"user_id":        userID,
		"plan_id":        planID,
		"amount":         49.90,
		"status":         "pending",
		"payment_method": "test",
		"paid_at":        time.Now().Format(time.RFC3339),
	}
	jsonBody, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", baseURL+"/api/superadmin/payments", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Erro ao criar requisição de criação de pagamento: %v\n", err)
		return 0
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao criar pagamento SUPERADMIN: %v\n", err)
		return 0
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 201 {
		fmt.Printf("[FALHA] POST /api/superadmin/payments - Esperado 201, Recebido %d, Body: %s\n", resp.StatusCode, string(body))
		return 0
	}

	var payment SuperAdminPayment
	if err := json.Unmarshal(body, &payment); err != nil {
		fmt.Printf("Erro ao decodificar pagamento criado: %v\n", err)
		return 0
	}

	fmt.Printf("[OK] Pagamento de teste criado - ID %d\n", payment.ID)

	updatePayload := map[string]interface{}{
		"status": "paid",
	}
	updateBody, _ := json.Marshal(updatePayload)

	updateReq, err := http.NewRequest("PUT", fmt.Sprintf("%s/api/superadmin/payments/%d", baseURL, payment.ID), bytes.NewBuffer(updateBody))
	if err != nil {
		fmt.Printf("Erro ao criar requisição de atualização de pagamento: %v\n", err)
		return payment.ID
	}
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", superadminJWT)

	updateResp, err := client.Do(updateReq)
	if err != nil {
		fmt.Printf("Erro ao atualizar pagamento SUPERADMIN: %v\n", err)
		return payment.ID
	}
	defer updateResp.Body.Close()

	updateRespBody, _ := ioutil.ReadAll(updateResp.Body)
	if updateResp.StatusCode != 200 {
		fmt.Printf("[FALHA] PUT /api/superadmin/payments/%d - Esperado 200, Recebido %d, Body: %s\n", payment.ID, updateResp.StatusCode, string(updateRespBody))
	} else {
		fmt.Printf("[OK] Pagamento de teste atualizado - ID %d\n", payment.ID)
	}

	return payment.ID
}

func deleteTestPayment(baseURL, superadminJWT string, paymentID int64) {
	client := &http.Client{}
	req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/api/superadmin/payments/%d", baseURL, paymentID), nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de exclusão de pagamento: %v\n", err)
		return
	}
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao excluir pagamento SUPERADMIN: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 204 {
		fmt.Printf("[FALHA] DELETE /api/superadmin/payments/%d - Esperado 204, Recebido %d, Body: %s\n", paymentID, resp.StatusCode, string(body))
	} else {
		fmt.Printf("[OK] Pagamento de teste excluído - ID %d\n", paymentID)
	}
}

func testUserActivationToggle(baseURL, superadminJWT string, userID int64) {
	client := &http.Client{}

	deactivateReq, err := http.NewRequest("POST", fmt.Sprintf("%s/api/superadmin/users/%d/deactivate", baseURL, userID), nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de desativação de usuário: %v\n", err)
		return
	}
	deactivateReq.Header.Set("Authorization", superadminJWT)

	deactivateResp, err := client.Do(deactivateReq)
	if err != nil {
		fmt.Printf("Erro ao desativar usuário SUPERADMIN: %v\n", err)
		return
	}
	defer deactivateResp.Body.Close()

	deactivateBody, _ := ioutil.ReadAll(deactivateResp.Body)
	if deactivateResp.StatusCode != 204 {
		fmt.Printf("[FALHA] POST /api/superadmin/users/%d/deactivate - Esperado 204, Recebido %d, Body: %s\n", userID, deactivateResp.StatusCode, string(deactivateBody))
	} else {
		fmt.Printf("[OK] Usuário desativado para teste - ID %d\n", userID)
	}

	activateReq, err := http.NewRequest("POST", fmt.Sprintf("%s/api/superadmin/users/%d/activate", baseURL, userID), nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de ativação de usuário: %v\n", err)
		return
	}
	activateReq.Header.Set("Authorization", superadminJWT)

	activateResp, err := client.Do(activateReq)
	if err != nil {
		fmt.Printf("Erro ao ativar usuário SUPERADMIN: %v\n", err)
		return
	}
	defer activateResp.Body.Close()

	activateBody, _ := ioutil.ReadAll(activateResp.Body)
	if activateResp.StatusCode != 204 {
		fmt.Printf("[FALHA] POST /api/superadmin/users/%d/activate - Esperado 204, Recebido %d, Body: %s\n", userID, activateResp.StatusCode, string(activateBody))
	} else {
		fmt.Printf("[OK] Usuário reativado após teste - ID %d\n", userID)
	}
}

func testSuperAdminTrafficByID(baseURL, superadminJWT string) {
	client := &http.Client{}

	req, err := http.NewRequest("GET", baseURL+"/api/superadmin/traffic", nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de listagem de tráfego: %v\n", err)
		return
	}
	req.Header.Set("Authorization", superadminJWT)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao listar tráfego SUPERADMIN: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		fmt.Printf("[FALHA] GET /api/superadmin/traffic - Esperado 200, Recebido %d, Body: %s\n", resp.StatusCode, string(body))
		return
	}

	var traffic []SuperAdminTraffic
	if err := json.Unmarshal(body, &traffic); err != nil {
		fmt.Printf("Erro ao decodificar lista de tráfego: %v\n", err)
		return
	}

	if len(traffic) == 0 {
		fmt.Println("[INFO] Nenhum registro em /traffic para testar /traffic/{id}")
		return
	}

	id := traffic[0].ID

	detailURL := fmt.Sprintf("%s/api/superadmin/traffic/%s", baseURL, strconv.FormatInt(id, 10))
	detailReq, err := http.NewRequest("GET", detailURL, nil)
	if err != nil {
		fmt.Printf("Erro ao criar requisição de detalhe de tráfego: %v\n", err)
		return
	}
	detailReq.Header.Set("Authorization", superadminJWT)

	detailResp, err := client.Do(detailReq)
	if err != nil {
		fmt.Printf("Erro ao buscar detalhe de tráfego SUPERADMIN: %v\n", err)
		return
	}
	defer detailResp.Body.Close()

	detailBody, _ := ioutil.ReadAll(detailResp.Body)
	if detailResp.StatusCode != 200 {
		fmt.Printf("[FALHA] GET /api/superadmin/traffic/%d - Esperado 200, Recebido %d, Body: %s\n", id, detailResp.StatusCode, string(detailBody))
	} else {
		fmt.Printf("[OK] GET /api/superadmin/traffic/%d - Status %d\n", id, detailResp.StatusCode)
	}
}

func testRoute(method, url, jwt string, expectedStatus int) {
	client := &http.Client{}
	var req *http.Request
	var err error

	if method == "POST" || method == "PUT" {
		body := map[string]string{"teste": "ok"}
		jsonBody, _ := json.Marshal(body)
		req, err = http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, err = http.NewRequest(method, url, nil)
	}
	if err != nil {
		fmt.Printf("Erro ao criar requisição: %v\n", err)
		return
	}
	if jwt != "" {
		req.Header.Set("Authorization", jwt)
	}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Erro ao chamar %s: %v\n", url, err)
		return
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != expectedStatus {
		fmt.Printf("[FALHA] %s %s - Esperado %d, Recebido %d, Body: %s\n", method, url, expectedStatus, resp.StatusCode, string(body))
	} else {
		fmt.Printf("[OK] %s %s - Status %d\n", method, url, resp.StatusCode)
	}
}
