#!/bin/bash

# Script para testar APIs do backend CDNProxy
# Autor: Qoder AI Assistant
# Data: 2025-10-27

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Credenciais
SUPERADMIN_EMAIL="alaxricardsilva@gmail.com"
SUPERADMIN_PASSWORD="Admin123"
ADMIN_EMAIL="alaxricardsilva@outlook.com"
ADMIN_PASSWORD="Admin123"

# URL base
BASE_URL="https://api.cdnproxy.top"

# Arquivo para armazenar tokens
TOKEN_FILE="/tmp/cdnproxy_tokens.txt"

echo -e "${BLUE}=== Script de Teste de APIs CDNProxy ===${NC}"
echo -e "${BLUE}Base URL: $BASE_URL${NC}"
echo

# Função para fazer login e obter token
get_token() {
    local email=$1
    local password=$2
    local user_type=$3
    
    echo -e "${YELLOW}Obtendo token para $user_type ($email)...${NC}"
    
    response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$email\", \"password\": \"$password\"}")
    
    # Extrair token do response
    token=$(echo "$response" | jq -r '.session.access_token')
    
    if [ "$token" != "null" ] && [ -n "$token" ]; then
        echo "$user_type=$token" >> "$TOKEN_FILE"
        echo -e "${GREEN}✓ Token obtido com sucesso para $user_type${NC}"
        return 0
    else
        echo -e "${RED}✗ Falha ao obter token para $user_type${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Função para testar uma API
test_api() {
    local endpoint=$1
    local method=${2:-GET}
    local user_type=$3
    local description=$4
    
    # Ler token do arquivo
    if [ -f "$TOKEN_FILE" ]; then
        token=$(grep "^$user_type=" "$TOKEN_FILE" | cut -d'=' -f2)
    fi
    
    if [ -z "$token" ]; then
        echo -e "${RED}✗ Token não encontrado para $user_type${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Testando: $description ($method $endpoint)${NC}"
    
    local response_file="/tmp/api_response_$$.json"
    
    if [ "$method" == "GET" ]; then
        http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
            -H "Authorization: Bearer $token" \
            "$BASE_URL$endpoint")
    else
        http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
            -X "$method" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint")
    fi
    
    # Verificar se a resposta é JSON
    if jq -e . >/dev/null 2>&1 < "$response_file"; then
        is_json=true
    else
        is_json=false
    fi
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        if [ "$is_json" = true ]; then
            echo -e "${GREEN}✓ Sucesso ($http_code) - JSON válido${NC}"
        else
            echo -e "${RED}✗ Sucesso ($http_code) mas resposta não é JSON${NC}"
            echo "Conteúdo da resposta:"
            cat "$response_file"
        fi
    elif [ "$http_code" -eq 401 ]; then
        echo -e "${YELLOW}⚠ Acesso não autorizado ($http_code)${NC}"
        if [ "$is_json" = true ]; then
            echo "Mensagem: $(jq -r '.message' "$response_file" 2>/dev/null || echo "Sem mensagem")"
        fi
    elif [ "$http_code" -eq 403 ]; then
        echo -e "${YELLOW}⚠ Acesso proibido ($http_code)${NC}"
        if [ "$is_json" = true ]; then
            echo "Mensagem: $(jq -r '.message' "$response_file" 2>/dev/null || echo "Sem mensagem")"
        fi
    else
        echo -e "${RED}✗ Erro ($http_code)${NC}"
        if [ "$is_json" = true ]; then
            echo "Mensagem: $(jq -r '.message // .statusMessage' "$response_file" 2>/dev/null || echo "Sem mensagem")"
        else
            echo "Conteúdo da resposta:"
            cat "$response_file"
        fi
    fi
    
    # Limpar arquivo temporário
    rm -f "$response_file"
    echo
}

# Função para testar API sem autenticação (deve retornar erro 401 em JSON)
test_api_no_auth() {
    local endpoint=$1
    local method=${2:-GET}
    local description=$3
    
    echo -e "${BLUE}Testando sem autenticação: $description ($method $endpoint)${NC}"
    
    local response_file="/tmp/api_response_$$.json"
    
    if [ "$method" == "GET" ]; then
        http_code=$(curl -s -w "%{http_code}" -o "$response_file" "$BASE_URL$endpoint")
    else
        http_code=$(curl -s -w "%{http_code}" -o "$response_file" \
            -X "$method" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint")
    fi
    
    # Verificar se a resposta é JSON
    if jq -e . >/dev/null 2>&1 < "$response_file"; then
        is_json=true
        # Verificar se é um erro 401
        error_status=$(jq -r '.statusCode' "$response_file" 2>/dev/null || echo "")
    else
        is_json=false
    fi
    
    if [ "$http_code" -eq 401 ] && [ "$is_json" = true ] && [ "$error_status" = "401" ]; then
        echo -e "${GREEN}✓ Correto - Retorna erro 401 em JSON${NC}"
        echo "Mensagem: $(jq -r '.message' "$response_file" 2>/dev/null || echo "Sem mensagem")"
    elif [ "$http_code" -eq 200 ] && [ "$is_json" = false ]; then
        echo -e "${RED}✗ Incorreto - Retorna página HTML em vez de erro 401${NC}"
    else
        echo -e "${YELLOW}⚠ Outro resultado ($http_code)${NC}"
        if [ "$is_json" = true ]; then
            echo "Mensagem: $(jq -r '.message // .statusMessage' "$response_file" 2>/dev/null || echo "Sem mensagem")"
        else
            echo "Conteúdo da resposta (não JSON):"
            head -n 5 "$response_file"
        fi
    fi
    
    # Limpar arquivo temporário
    rm -f "$response_file"
    echo
}

# Limpar arquivo de tokens
> "$TOKEN_FILE"

# Testar autenticação
echo -e "${BLUE}=== Testando Autenticação ===${NC}"
get_token "$SUPERADMIN_EMAIL" "$SUPERADMIN_PASSWORD" "SUPERADMIN"
get_token "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "ADMIN"
echo

# Testar APIs sem autenticação (verificar se retornam erro 401 em JSON)
echo -e "${BLUE}=== Testando APIs sem Autenticação ===${NC}"
test_api_no_auth "/api/health" "GET" "Health Check"
test_api_no_auth "/api/superadmin/users" "GET" "Superadmin Users"
test_api_no_auth "/api/admin/domains" "GET" "Admin Domains"
test_api_no_auth "/api/analytics/overview" "GET" "Analytics Overview"
echo

# Testar APIs com autenticação SUPERADMIN
echo -e "${BLUE}=== Testando APIs com Autenticação SUPERADMIN ===${NC}"
test_api "/api/health" "GET" "SUPERADMIN" "Health Check"
test_api "/api/superadmin/users" "GET" "SUPERADMIN" "Superadmin Users List"
test_api "/api/superadmin/domains" "GET" "SUPERADMIN" "Superadmin Domains List"
test_api "/api/superadmin/payments" "GET" "SUPERADMIN" "Superadmin Payments"
test_api "/api/superadmin/plans" "GET" "SUPERADMIN" "Superadmin Plans"
test_api "/api/superadmin/profile" "GET" "SUPERADMIN" "Superadmin Profile"
test_api "/api/superadmin/stats" "GET" "SUPERADMIN" "Superadmin Stats"
test_api "/api/superadmin/system-health" "GET" "SUPERADMIN" "Superadmin System Health"
test_api "/api/superadmin/traffic" "GET" "SUPERADMIN" "Superadmin Traffic"
test_api "/api/superadmin/analytics" "GET" "SUPERADMIN" "Superadmin Analytics"
echo

# Testar APIs com autenticação ADMIN
echo -e "${BLUE}=== Testando APIs com Autenticação ADMIN ===${NC}"
test_api "/api/health" "GET" "ADMIN" "Health Check"
test_api "/api/admin/domains" "GET" "ADMIN" "Admin Domains List"
test_api "/api/admin/payments" "GET" "ADMIN" "Admin Payments"
test_api "/api/admin/plans" "GET" "ADMIN" "Admin Plans"
test_api "/api/admin/profile" "GET" "ADMIN" "Admin Profile"
test_api "/api/admin/notifications" "GET" "ADMIN" "Admin Notifications"
test_api "/api/domains" "GET" "ADMIN" "Domains List"
test_api "/api/analytics/overview" "GET" "ADMIN" "Analytics Overview"
test_api "/api/analytics/traffic" "GET" "ADMIN" "Analytics Traffic"
test_api "/api/analytics/access" "GET" "ADMIN" "Analytics Access"
echo

# Testar APIs de autenticação
echo -e "${BLUE}=== Testando APIs de Autenticação ===${NC}"
test_api "/api/auth/me" "GET" "SUPERADMIN" "Auth Me"
test_api "/api/auth/profile" "GET" "SUPERADMIN" "Auth Profile"
test_api "/api/auth/verify-superadmin" "GET" "SUPERADMIN" "Verify Superadmin"
test_api "/api/auth/verify-admin" "GET" "ADMIN" "Verify Admin"
echo

# Testar APIs de sistema
echo -e "${BLUE}=== Testando APIs de Sistema ===${NC}"
test_api "/api/system/config" "GET" "SUPERADMIN" "System Config"
test_api "/api/system/stats" "GET" "SUPERADMIN" "System Stats"
test_api "/api/metrics" "GET" "SUPERADMIN" "Metrics"
echo

# Testar APIs de domínios
echo -e "${BLUE}=== Testando APIs de Domínios ===${NC}"
test_api "/api/domains" "GET" "ADMIN" "Domains List"
echo

# Testar APIs de analytics
echo -e "${BLUE}=== Testando APIs de Analytics ===${NC}"
test_api "/api/analytics/overview" "GET" "ADMIN" "Analytics Overview"
test_api "/api/analytics/traffic" "GET" "ADMIN" "Analytics Traffic"
test_api "/api/analytics/access" "GET" "ADMIN" "Analytics Access"
test_api "/api/analytics/bandwidth" "GET" "ADMIN" "Analytics Bandwidth"
test_api "/api/analytics/requests" "GET" "ADMIN" "Analytics Requests"
test_api "/api/analytics/content" "GET" "ADMIN" "Analytics Content"
test_api "/api/analytics/errors" "GET" "ADMIN" "Analytics Errors"
test_api "/api/analytics/metrics" "GET" "ADMIN" "Analytics Metrics"
echo

# Testar APIs de pagamentos
echo -e "${BLUE}=== Testando APIs de Pagamentos ===${NC}"
test_api "/api/payments/list" "GET" "ADMIN" "Payments List"
test_api "/api/payments/history" "GET" "ADMIN" "Payments History"
test_api "/api/admin/payments" "GET" "ADMIN" "Admin Payments"
echo

# Testar APIs de planos
echo -e "${BLUE}=== Testando APIs de Planos ===${NC}"
test_api "/api/plans" "GET" "ADMIN" "Plans List"
test_api "/api/admin/plans" "GET" "ADMIN" "Admin Plans"
echo

# Testar APIs de notificações
echo -e "${BLUE}=== Testando APIs de Notificações ===${NC}"
test_api "/api/notifications" "GET" "ADMIN" "Notifications List"
test_api "/api/admin/notifications" "GET" "ADMIN" "Admin Notifications"
echo

# Testar APIs de perfil
echo -e "${BLUE}=== Testando APIs de Perfil ===${NC}"
test_api "/api/profile" "GET" "ADMIN" "User Profile"
test_api "/api/admin/profile" "GET" "ADMIN" "Admin Profile"
test_api "/api/superadmin/profile" "GET" "SUPERADMIN" "Superadmin Profile"
echo

# Limpar arquivos temporários
rm -f "$TOKEN_FILE"

echo -e "${GREEN}=== Testes concluídos ===${NC}"