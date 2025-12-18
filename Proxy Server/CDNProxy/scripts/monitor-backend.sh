#!/bin/bash

# ============================================================================
# CDN Proxy - Script de Monitoramento Avançado do Backend
# Servidor 2 (Backend)
# Versão: 1.1.3
# Data: 21 de Outubro de 2025
# ============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configurações padrão
REFRESH_INTERVAL=5
LOG_LINES=20
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=85
CONFIG_FILE="/tmp/monitor-backend.conf"
ALERT_LOG="/tmp/monitor-backend-alerts.log"

# Função para salvar configurações
save_config() {
    cat > "$CONFIG_FILE" << EOF
REFRESH_INTERVAL=$REFRESH_INTERVAL
LOG_LINES=$LOG_LINES
ALERT_THRESHOLD_CPU=$ALERT_THRESHOLD_CPU
ALERT_THRESHOLD_MEM=$ALERT_THRESHOLD_MEM
EOF
}

# Função para carregar configurações
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
    fi
}

# Funções de logging
log() {
    echo -e "${GREEN}[$(date +'%d-%m-%Y %H:%M:%S')] INFO: $1${NC}"
}

warn() {
    local msg="[$(date +'%d-%m-%Y %H:%M:%S')] WARN: $1"
    echo -e "${YELLOW}$msg${NC}"
    echo "$msg" >> "$ALERT_LOG"
}

error() {
    local msg="[$(date +'%d-%m-%Y %H:%M:%S')] ERROR: $1"
    echo -e "${RED}$msg${NC}"
    echo "$msg" >> "$ALERT_LOG"
}

info() {
    echo -e "${BLUE}[$(date +'%d-%m-%Y %H:%M:%S')] INFO: $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

critical_alert() {
    local msg="[$(date +'%d-%m-%Y %H:%M:%S')] CRITICAL: $1"
    echo -e "${RED}🚨 $msg${NC}"
    echo "$msg" >> "$ALERT_LOG"
}

# Função para obter métricas do container
get_container_metrics() {
    local container_name="$1"
    
    if ! docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        echo "OFFLINE"
        return 1
    fi
    
    local stats=$(docker stats "$container_name" --no-stream --format "{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}" 2>/dev/null)
    
    if [[ -z "$stats" ]]; then
        echo "ERROR"
        return 1
    fi
    
    echo "$stats"
}

# Função para verificar serviço com métricas avançadas
check_service_advanced() {
    local service_name="$1"
    local url="$2"
    local container_name="$3"
    
    # Obter métricas do container
    local metrics=$(get_container_metrics "$container_name")
    if [[ "$metrics" == "OFFLINE" ]]; then
        error "$service_name: Container não está rodando"
        return 1
    elif [[ "$metrics" == "ERROR" ]]; then
        error "$service_name: Erro ao obter métricas"
        return 1
    fi
    
    # Parse das métricas
    IFS=',' read -r cpu_perc mem_usage mem_perc net_io block_io <<< "$metrics"
    
    # Remover % do CPU e converter para número
    cpu_num=$(echo "$cpu_perc" | sed 's/%//' | sed 's/,/./')
    mem_num=$(echo "$mem_perc" | sed 's/%//' | sed 's/,/./')
    
    # Verificar alertas
    local alerts=""
    if (( $(echo "$cpu_num > $ALERT_THRESHOLD_CPU" | bc -l 2>/dev/null || echo "0") )); then
        alerts="${alerts}🔥CPU "
        warn "$service_name: CPU alto (${cpu_perc})"
    fi
    
    if (( $(echo "$mem_num > $ALERT_THRESHOLD_MEM" | bc -l 2>/dev/null || echo "0") )); then
        alerts="${alerts}🔥MEM "
        warn "$service_name: Memória alta (${mem_perc})"
    fi
    
    # Testar conectividade HTTP
    local start_time=$(date +%s.%N)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s.%N)
    local response_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    response_time=$(printf "%.3f" "$response_time" 2>/dev/null || echo "0.000")
    
    if [[ "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        echo -e "${GREEN}✅ $service_name${NC} | CPU: ${cpu_perc} | MEM: ${mem_usage} (${mem_perc}) | HTTP: ${http_code} (${response_time}s) ${alerts}"
        return 0
    else
        error "$service_name: HTTP $http_code | Response: ${response_time}s"
        return 1
    fi
}

# Função para verificar Redis com métricas avançadas
check_redis_advanced() {
    local container_name="cdnproxy-redis"
    
    if ! docker ps | grep -q "$container_name"; then
        error "Redis: Container não está rodando"
        return 1
    fi
    
    # Obter métricas do container
    local metrics=$(get_container_metrics "$container_name")
    if [[ "$metrics" == "OFFLINE" ]] || [[ "$metrics" == "ERROR" ]]; then
        error "Redis: Não foi possível obter métricas"
        return 1
    fi
    
    # Parse das métricas
    IFS=',' read -r cpu_perc mem_usage mem_perc net_io block_io <<< "$metrics"
    
    # Testar conectividade Redis
    local start_time=$(date +%s.%N)
    local redis_response=$(docker exec "$container_name" redis-cli ping 2>/dev/null)
    local end_time=$(date +%s.%N)
    local response_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    response_time=$(printf "%.3f" "$response_time" 2>/dev/null || echo "0.000")
    
    if [[ "$redis_response" == "PONG" ]]; then
        # Obter informações adicionais do Redis
        local redis_info=$(docker exec "$container_name" redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        local redis_clients=$(docker exec "$container_name" redis-cli info clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '\r')
        
        echo -e "${GREEN}✅ Redis${NC} | CPU: ${cpu_perc} | MEM: ${mem_usage} (${mem_perc}) | Used: ${redis_info} | Clients: ${redis_clients} | Ping: ${response_time}s"
        return 0
    else
        error "Redis: Não responde ao PING | Response: ${response_time}s"
        return 1
    fi
}

# Função para verificar Supabase com métricas avançadas
check_supabase_advanced() {
    echo -e "${CYAN}🔍 Verificando Supabase...${NC}"
    
    # Verificar se as variáveis de ambiente estão definidas
    local supabase_url=""
    local supabase_key=""
    
    # Tentar obter as variáveis do container backend
    if docker ps | grep -q "cdnproxy-backend"; then
        supabase_url=$(docker exec cdnproxy-backend printenv SUPABASE_URL 2>/dev/null || echo "")
        supabase_key=$(docker exec cdnproxy-backend printenv SUPABASE_SERVICE_ROLE_KEY 2>/dev/null || echo "")
    fi
    
    if [[ -z "$supabase_url" ]] || [[ -z "$supabase_key" ]]; then
        error "Supabase: Variáveis de ambiente não configuradas"
        return 1
    fi
    
    # Testar conectividade com Supabase via API REST
    local start_time=$(date +%s.%N)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --connect-timeout 10 --max-time 15 \
        -H "apikey: $supabase_key" \
        -H "Authorization: Bearer $supabase_key" \
        "$supabase_url/rest/v1/users?select=id&limit=1" 2>/dev/null || echo "000")
    local end_time=$(date +%s.%N)
    local response_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    response_time=$(printf "%.3f" "$response_time" 2>/dev/null || echo "0.000")
    
    if [[ "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
        # Obter informações adicionais via backend health endpoint
        local backend_health=""
        if docker ps | grep -q "cdnproxy-backend"; then
            backend_health=$(curl -s --connect-timeout 5 --max-time 10 "http://localhost:5001/api/health" 2>/dev/null | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6 || echo "unknown")
        fi
        
        echo -e "${GREEN}✅ Supabase${NC} | HTTP: ${http_code} | Response: ${response_time}s | Backend Health: ${backend_health}"
        return 0
    else
        error "Supabase: HTTP $http_code | Response: ${response_time}s"
        return 1
    fi
}

# Função para monitoramento em tempo real avançado do backend
realtime_monitor_backend() {
    local interval=${1:-$REFRESH_INTERVAL}
    
    # Configurar trap para capturar Ctrl+C
    trap 'echo -e "\n${YELLOW}Monitoramento interrompido pelo usuário${NC}"; return 0' INT
    
    echo -e "${CYAN}🔄 Iniciando monitoramento em tempo real do Backend (intervalo: ${interval}s)${NC}"
    echo -e "${YELLOW}Pressione Ctrl+C para parar${NC}"
    echo ""
    
    local iteration=0
    
    while true; do
        iteration=$((iteration + 1))
        
        # Limpar tela
        clear
        
        # Cabeçalho
        echo -e "${WHITE}╔══════════════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${WHITE}║                    CDN PROXY - MONITORAMENTO EM TEMPO REAL                          ║${NC}"
        echo -e "${WHITE}║                              Servidor 2 (Backend)                                   ║${NC}"
        echo -e "${WHITE}╠══════════════════════════════════════════════════════════════════════════════════════╣${NC}"
        echo -e "${WHITE}║ $(date +'%d-%m-%Y %H:%M:%S') | Iteração: $iteration | Intervalo: ${interval}s                           ║${NC}"
        echo -e "${WHITE}╚══════════════════════════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        
        # Status dos serviços
        echo -e "${BLUE}📊 STATUS DOS SERVIÇOS:${NC}"
        echo "────────────────────────────────────────────────────────────────────────────────────────"
        
        # Verificar Redis
        check_redis_advanced
        
        # Verificar Supabase
        check_supabase_advanced
        
        # Verificar Backend
        check_service_advanced "Backend" "http://localhost:5001/api/health" "cdnproxy-backend"
        
        echo ""
        
        # Estatísticas do sistema
        echo -e "${PURPLE}💻 RECURSOS DO SISTEMA:${NC}"
        echo "────────────────────────────────────────────────────────────────────────────────────────"
        
        # CPU e Memória do host
        local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        local mem_info=$(free -h | grep "Mem:")
        local mem_used=$(echo $mem_info | awk '{print $3}')
        local mem_total=$(echo $mem_info | awk '{print $2}')
        local mem_percent=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
        
        echo -e "🖥️  Host: CPU ${cpu_usage}% | RAM ${mem_used}/${mem_total} (${mem_percent}%)"
        
        # Uso de disco
        local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
        local disk_used=$(df -h / | tail -1 | awk '{print $3}')
        local disk_total=$(df -h / | tail -1 | awk '{print $2}')
        
        echo -e "💾 Disco: ${disk_used}/${disk_total} (${disk_usage}%)"
        
        # Load average
        local load_avg=$(uptime | awk -F'load average:' '{print $2}')
        echo -e "⚡ Load Average:${load_avg}"
        
        echo ""
        
        # Conexões de rede ativas
        echo -e "${CYAN}🌐 CONEXÕES DE REDE:${NC}"
        echo "────────────────────────────────────────────────────────────────────────────────────────"
        
        local port_5001=$(netstat -an 2>/dev/null | grep ":5001" | grep LISTEN | wc -l)
        local port_6380=$(netstat -an 2>/dev/null | grep ":6380" | grep LISTEN | wc -l)
        local active_connections=$(netstat -an 2>/dev/null | grep ESTABLISHED | wc -l)
        
        echo -e "🔌 Backend (5001): $([ $port_5001 -gt 0 ] && echo -e "${GREEN}LISTENING${NC}" || echo -e "${RED}NOT LISTENING${NC}")"
        echo -e "🔌 Redis (6380): $([ $port_6380 -gt 0 ] && echo -e "${GREEN}LISTENING${NC}" || echo -e "${RED}NOT LISTENING${NC}")"
        echo -e "🔗 Conexões ativas: $active_connections"
        
        echo ""
        
        # Estatísticas do banco de dados via backend
        echo -e "${YELLOW}🗄️  ESTATÍSTICAS DO BANCO (SUPABASE):${NC}"
        echo "────────────────────────────────────────────────────────────────────────────────────────"
        
        if docker ps | grep -q "cdnproxy-backend"; then
            # Tentar obter estatísticas via API do backend
            local backend_stats=$(curl -s --connect-timeout 5 --max-time 10 "http://localhost:5001/api/superadmin/system-stats" 2>/dev/null)
            if [[ -n "$backend_stats" ]]; then
                local total_users=$(echo "$backend_stats" | grep -o '"totalUsers":[0-9]*' | cut -d: -f2 || echo "N/A")
                local total_domains=$(echo "$backend_stats" | grep -o '"totalDomains":[0-9]*' | cut -d: -f2 || echo "N/A")
                local total_logs=$(echo "$backend_stats" | grep -o '"totalLogs":[0-9]*' | cut -d: -f2 || echo "N/A")
                
                echo -e "👥 Total de usuários: $total_users"
                echo -e "🌐 Total de domínios: $total_domains"
                echo -e "📊 Total de logs: $total_logs"
            else
                echo -e "${YELLOW}⚠️  Não foi possível obter estatísticas do backend${NC}"
            fi
        else
            echo -e "${RED}❌ Backend não está rodando${NC}"
        fi
        
        echo ""
        
        # Logs recentes (últimas 3 linhas de cada serviço)
        echo -e "${YELLOW}📝 LOGS RECENTES:${NC}"
        echo "────────────────────────────────────────────────────────────────────────────────────────"
        
        echo -e "${GREEN}Backend (últimas 3 linhas):${NC}"
        docker logs cdnproxy-backend --tail 3 2>/dev/null | sed 's/^/  /' || echo "  Nenhum log disponível"
        
        echo -e "${GREEN}Redis (últimas 3 linhas):${NC}"
        docker logs cdnproxy-redis --tail 3 2>/dev/null | sed 's/^/  /' || echo "  Nenhum log disponível"
        
        echo ""
        echo -e "${BLUE}⏰ Próxima atualização em ${interval} segundos... (Ctrl+C para parar)${NC}"
        
        # Aguardar intervalo
        sleep "$interval"
    done
}

# Menu principal
show_menu() {
    echo -e "${WHITE}╔══════════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                           CDN PROXY - MONITOR BACKEND                                ║${NC}"
    echo -e "${WHITE}║                              Servidor 2 (Backend)                                   ║${NC}"
    echo -e "${WHITE}╠══════════════════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${WHITE}║                                  OPÇÕES:                                             ║${NC}"
    echo -e "${WHITE}╚══════════════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🔄 MONITORAMENTO:${NC}"
    echo -e "  ${GREEN}1)${NC} Status dos serviços (verificação única)"
    echo -e "  ${GREEN}2)${NC} Monitoramento em tempo real (sem limite)"
    echo -e "  ${GREEN}3)${NC} Monitoramento contínuo (30s - modo legado)"
    echo ""
    echo -e "${PURPLE}📊 ESTATÍSTICAS:${NC}"
    echo -e "  ${GREEN}4)${NC} Estatísticas do sistema"
    echo -e "  ${GREEN}5)${NC} Logs recentes"
    echo -e "  ${GREEN}6)${NC} Estatísticas do banco de dados (Supabase)"
    echo ""
    echo -e "${YELLOW}⚙️  CONFIGURAÇÃO:${NC}"
    echo -e "  ${GREEN}7)${NC} Configurar parâmetros de monitoramento"
    echo -e "  ${GREEN}8)${NC} Reiniciar serviços"
    echo ""
    echo -e "${RED}🚪 SAIR:${NC}"
    echo -e "  ${GREEN}0)${NC} Sair"
    echo ""
    echo -e "${BLUE}Configuração atual: Intervalo=${REFRESH_INTERVAL}s | CPU Alert=${ALERT_THRESHOLD_CPU}% | MEM Alert=${ALERT_THRESHOLD_MEM}%${NC}"
    echo ""
    read -p "Escolha uma opção: " choice
}

# Função para mostrar estatísticas do sistema
show_stats() {
    echo -e "${PURPLE}💻 ESTATÍSTICAS DO SISTEMA${NC}"
    echo "────────────────────────────────────────────────────────────────────────────────────────"
    echo ""
    
    # Informações do sistema
    echo -e "${CYAN}Sistema:${NC}"
    echo "  Hostname: $(hostname)"
    echo "  Uptime: $(uptime -p)"
    echo "  Kernel: $(uname -r)"
    echo ""
    
    # CPU
    echo -e "${CYAN}CPU:${NC}"
    local cpu_model=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
    local cpu_cores=$(nproc)
    echo "  Modelo: $cpu_model"
    echo "  Cores: $cpu_cores"
    echo ""
    
    # Memória
    echo -e "${CYAN}Memória:${NC}"
    free -h
    echo ""
    
    # Disco
    echo -e "${CYAN}Uso de Disco:${NC}"
    df -h | grep -E "^/dev/"
    echo ""
    
    # Containers Docker
    echo -e "${CYAN}Containers Docker:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Função para mostrar logs recentes
show_logs() {
    echo -e "${YELLOW}📝 LOGS RECENTES${NC}"
    echo "────────────────────────────────────────────────────────────────────────────────────────"
    echo ""
    
    echo -e "${GREEN}Backend (últimas $LOG_LINES linhas):${NC}"
    docker logs cdnproxy-backend --tail $LOG_LINES 2>/dev/null || echo "Nenhum log disponível"
    
    echo ""
    echo -e "${GREEN}Redis (últimas $LOG_LINES linhas):${NC}"
    docker logs cdnproxy-redis --tail $LOG_LINES 2>/dev/null || echo "Nenhum log disponível"
    
    echo ""
    echo -e "${GREEN}Alertas do sistema (últimas $LOG_LINES linhas):${NC}"
    if [[ -f "$ALERT_LOG" ]]; then
        tail -n $LOG_LINES "$ALERT_LOG"
    else
        echo "Nenhum alerta registrado"
    fi
}

# Função para autenticar superadmin
authenticate_superadmin() {
    local email=""
    local password=""
    local token=""
    
    echo -e "${CYAN}🔐 AUTENTICAÇÃO DE SUPERADMIN${NC}"
    echo "────────────────────────────────────────────────────────────────────────────────────────"
    echo ""
    
    # Solicitar credenciais
    read -p "Email do superadmin: " email
    read -s -p "Senha: " password
    echo ""
    echo ""
    
    if [[ -z "$email" ]] || [[ -z "$password" ]]; then
        error "Email e senha são obrigatórios"
        return 1
    fi
    
    # Tentar fazer login
    echo -e "${YELLOW}🔄 Autenticando...${NC}"
    local login_response=$(curl -s --connect-timeout 10 --max-time 15 \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
        "http://localhost:5001/api/auth/login" 2>/dev/null)
    
    if [[ -z "$login_response" ]]; then
        error "Falha na comunicação com o backend"
        return 1
    fi
    
    # Verificar se o login foi bem-sucedido
    local success=$(echo "$login_response" | grep -o '"success":true' || echo "")
    if [[ -z "$success" ]]; then
        local error_msg=$(echo "$login_response" | grep -o '"statusMessage":"[^"]*"' | cut -d'"' -f4 || echo "Credenciais inválidas")
        error "Falha na autenticação: $error_msg"
        return 1
    fi
    
    # Extrair token de acesso
    if command -v jq >/dev/null 2>&1; then
        token=$(echo "$login_response" | jq -r '.session.access_token // ""' 2>/dev/null)
    else
        token=$(echo "$login_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4 || echo "")
    fi
    
    if [[ -z "$token" ]]; then
        error "Token de acesso não encontrado na resposta"
        return 1
    fi
    
    # Verificar se o usuário é superadmin
    echo -e "${YELLOW}🔍 Verificando permissões de superadmin...${NC}"
    local verify_response=$(curl -s --connect-timeout 10 --max-time 15 \
        -H "Authorization: Bearer $token" \
        "http://localhost:5001/api/auth/verify-superadmin" 2>/dev/null)
    
    if [[ -z "$verify_response" ]]; then
        error "Falha na verificação de permissões"
        return 1
    fi
    
    local verify_success=$(echo "$verify_response" | grep -o '"success":true' || echo "")
    if [[ -z "$verify_success" ]]; then
        local error_msg=$(echo "$verify_response" | grep -o '"statusMessage":"[^"]*"' | cut -d'"' -f4 || echo "Usuário não é superadmin")
        error "Verificação falhou: $error_msg"
        return 1
    fi
    
    success "Autenticação de superadmin bem-sucedida!"
    echo "$token"
    return 0
}

# Função para obter estatísticas detalhadas com autenticação
get_detailed_stats() {
    local token="$1"
    
    if [[ -z "$token" ]]; then
        error "Token de autenticação não fornecido"
        return 1
    fi
    
    echo -e "${YELLOW}📊 Obtendo estatísticas detalhadas...${NC}"
    
    # Tentar obter estatísticas via endpoint de superadmin
    local stats_response=$(curl -s --connect-timeout 10 --max-time 15 \
        -H "Authorization: Bearer $token" \
        "http://localhost:5001/api/superadmin/system-stats" 2>/dev/null)
    
    if [[ -z "$stats_response" ]]; then
        warn "Não foi possível obter estatísticas via /api/superadmin/system-stats"
        return 1
    fi
    
    # Verificar se a resposta contém dados válidos
    local has_success=$(echo "$stats_response" | grep -o '"success":true' || echo "")
    if [[ -z "$has_success" ]]; then
        local error_msg=$(echo "$stats_response" | grep -o '"statusMessage":"[^"]*"' | cut -d'"' -f4 || echo "Erro desconhecido")
        warn "Falha ao obter estatísticas: $error_msg"
        return 1
    fi
    
    echo -e "${GREEN}✅ Estatísticas obtidas com sucesso!${NC}"
    echo ""
    
    # Parse das estatísticas
    if command -v jq >/dev/null 2>&1; then
        # Usar jq para parsing detalhado
        local total_users=$(echo "$stats_response" | jq -r '.data.users.total // 0' 2>/dev/null)
        local active_users=$(echo "$stats_response" | jq -r '.data.users.active // 0' 2>/dev/null)
        local new_users_today=$(echo "$stats_response" | jq -r '.data.users.new_today // 0' 2>/dev/null)
        
        local total_domains=$(echo "$stats_response" | jq -r '.data.domains.total // 0' 2>/dev/null)
        local active_domains=$(echo "$stats_response" | jq -r '.data.domains.active // 0' 2>/dev/null)
        local inactive_domains=$(echo "$stats_response" | jq -r '.data.domains.inactive // 0' 2>/dev/null)
        
        local total_requests=$(echo "$stats_response" | jq -r '.data.requests.total // 0' 2>/dev/null)
        local requests_today=$(echo "$stats_response" | jq -r '.data.requests.today // 0' 2>/dev/null)
        local requests_last_hour=$(echo "$stats_response" | jq -r '.data.requests.last_hour // 0' 2>/dev/null)
        
        local system_uptime=$(echo "$stats_response" | jq -r '.data.system.uptime // "unknown"' 2>/dev/null)
        local memory_used=$(echo "$stats_response" | jq -r '.data.system.memory.used // "unknown"' 2>/dev/null)
        local memory_total=$(echo "$stats_response" | jq -r '.data.system.memory.total // "unknown"' 2>/dev/null)
        local memory_percentage=$(echo "$stats_response" | jq -r '.data.system.memory.usage_percentage // "unknown"' 2>/dev/null)
        local node_version=$(echo "$stats_response" | jq -r '.data.system.node_version // "unknown"' 2>/dev/null)
        local platform=$(echo "$stats_response" | jq -r '.data.system.platform // "unknown"' 2>/dev/null)
        local arch=$(echo "$stats_response" | jq -r '.data.system.arch // "unknown"' 2>/dev/null)
        
        # Obter estatísticas de servidores múltiplos
        local total_servers=$(echo "$stats_response" | jq -r '.data.servers.total // 0' 2>/dev/null)
        local active_servers=$(echo "$stats_response" | jq -r '.data.servers.active // 0' 2>/dev/null)
        local inactive_servers=$(echo "$stats_response" | jq -r '.data.servers.inactive // 0' 2>/dev/null)
        
        local api_servers=$(echo "$stats_response" | jq -r '.data.servers.by_type.api // 0' 2>/dev/null)
        local proxy_servers=$(echo "$stats_response" | jq -r '.data.servers.by_type.proxy // 0' 2>/dev/null)
        local cdn_servers=$(echo "$stats_response" | jq -r '.data.servers.by_type.cdn // 0' 2>/dev/null)
        local db_servers=$(echo "$stats_response" | jq -r '.data.servers.by_type.database // 0' 2>/dev/null)
        local cache_servers=$(echo "$stats_response" | jq -r '.data.servers.by_type.cache // 0' 2>/dev/null)
        
        echo -e "${CYAN}👥 USUÁRIOS:${NC}"
        echo -e "  📊 Total: $total_users"
        echo -e "  ✅ Ativos: $active_users"
        echo -e "  🆕 Novos hoje: $new_users_today"
        echo ""
        
        echo -e "${CYAN}🌐 DOMÍNIOS:${NC}"
        echo -e "  📊 Total: $total_domains"
        echo -e "  ✅ Ativos: $active_domains"
        echo -e "  ❌ Inativos: $inactive_domains"
        echo ""
        
        echo -e "${CYAN}📈 REQUISIÇÕES:${NC}"
        echo -e "  📊 Total: $total_requests"
        echo -e "  📅 Hoje: $requests_today"
        echo -e "  ⏰ Última hora: $requests_last_hour"
        echo ""
        
        echo -e "${CYAN}🖥️  SERVIDORES:${NC}"
        echo -e "  📊 Total: $total_servers"
        echo -e "  ✅ Ativos: $active_servers"
        echo -e "  ❌ Inativos: $inactive_servers"
        echo -e "  📋 Por tipo:"
        echo -e "    🔌 API: $api_servers"
        echo -e "    🌐 Proxy: $proxy_servers"
        echo -e "    📡 CDN: $cdn_servers"
        echo -e "    🗄️  Database: $db_servers"
        echo -e "    💾 Cache: $cache_servers"
        echo ""
        
        echo -e "${CYAN}💻 SISTEMA:${NC}"
        echo -e "  ⏰ Uptime: ${system_uptime}s"
        echo -e "  💾 Memória: ${memory_used} / ${memory_total} (${memory_percentage}%)"
        echo -e "  🟢 Node.js: $node_version"
        echo -e "  🖥️  Plataforma: $platform ($arch)"
        
    else
        # Fallback para grep se jq não estiver disponível
        local total_users=$(echo "$stats_response" | grep -o '"total":[0-9]*' | head -1 | cut -d: -f2 || echo "N/A")
        local total_domains=$(echo "$stats_response" | grep -o '"domains":{"total":[0-9]*' | cut -d: -f3 || echo "N/A")
        local total_requests=$(echo "$stats_response" | grep -o '"requests":{"total":[0-9]*' | cut -d: -f3 || echo "N/A")
        local total_servers=$(echo "$stats_response" | grep -o '"servers":{"total":[0-9]*' | cut -d: -f3 || echo "N/A")
        
        echo -e "${CYAN}📊 ESTATÍSTICAS BÁSICAS:${NC}"
        echo -e "  👥 Total de usuários: $total_users"
        echo -e "  🌐 Total de domínios: $total_domains"
        echo -e "  📈 Total de requisições: $total_requests"
        echo -e "  🖥️  Total de servidores: $total_servers"
        echo ""
        echo -e "${YELLOW}💡 Para estatísticas detalhadas, instale 'jq': apt-get install jq${NC}"
    fi
    
    return 0
}

# Função para mostrar estatísticas do banco de dados (Supabase)
show_db_stats() {
    echo -e "${BLUE}=== Estatísticas do Sistema ===${NC}"
    echo
    
    # Prompt for superadmin authentication
    echo -e "${YELLOW}Para ver estatísticas detalhadas, é necessário autenticação de superadmin.${NC}"
    read -p "Deseja autenticar como superadmin? (s/n): " auth_choice
    
    if [[ "$auth_choice" =~ ^[Ss]$ ]]; then
        local access_token=$(authenticate_superadmin)
        if [[ $? -eq 0 && -n "$access_token" ]]; then
            echo -e "${GREEN}✓ Autenticação bem-sucedida!${NC}"
            echo
            get_detailed_stats "$access_token"
        else
            echo -e "${RED}✗ Falha na autenticação. Mostrando estatísticas básicas.${NC}"
            echo
            show_basic_stats
        fi
    else
        echo -e "${CYAN}Mostrando estatísticas básicas...${NC}"
        echo
        show_basic_stats
    fi
}

show_basic_stats() {
    echo -e "${CYAN}=== Estatísticas Básicas do Sistema ===${NC}"
    echo
    
    # Verificar saúde do backend
    echo -e "${YELLOW}Verificando saúde do backend...${NC}"
    local backend_health=$(curl -s --connect-timeout 5 --max-time 10 "http://localhost:5001/api/health" 2>/dev/null)
    
    if [[ -n "$backend_health" ]]; then
        if echo "$backend_health" | grep -q '"status":"ok"'; then
            echo -e "${GREEN}✓ Backend: Online${NC}"
        else
            echo -e "${RED}✗ Backend: Com problemas${NC}"
        fi
    else
        echo -e "${RED}✗ Backend: Offline ou inacessível${NC}"
    fi
    
    # Verificar Redis
    echo -e "${YELLOW}Verificando Redis...${NC}"
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping >/dev/null 2>&1; then
            echo -e "${GREEN}✓ Redis: Online${NC}"
        else
            echo -e "${RED}✗ Redis: Offline${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Redis CLI não disponível${NC}"
    fi
    
    # Verificar containers Docker se disponível
    if command -v docker >/dev/null 2>&1; then
        echo
        echo -e "${YELLOW}Verificando containers Docker...${NC}"
        
        # Backend container
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "backend"; then
            local backend_status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "backend" | awk '{print $2}')
            echo -e "${GREEN}✓ Container Backend: $backend_status${NC}"
        else
            echo -e "${RED}✗ Container Backend: Não encontrado${NC}"
        fi
        
        # Redis container
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "redis"; then
            local redis_status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "redis" | awk '{print $2}')
            echo -e "${GREEN}✓ Container Redis: $redis_status${NC}"
        else
            echo -e "${RED}✗ Container Redis: Não encontrado${NC}"
        fi
    fi
    
    # Métricas do sistema
    echo
    echo -e "${CYAN}=== Métricas do Sistema ===${NC}"
    
    # Uptime
    if command -v uptime >/dev/null 2>&1; then
        local system_uptime=$(uptime -p 2>/dev/null || uptime)
        echo -e "  Uptime: $system_uptime"
    fi
    
    # Load average
    if [[ -f /proc/loadavg ]]; then
        local load_avg=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
        echo -e "  Carga média: $load_avg"
    fi
    
    # Memory usage
    if command -v free >/dev/null 2>&1; then
        local memory_info=$(free -h | grep "Mem:")
        local memory_used=$(echo "$memory_info" | awk '{print $3}')
        local memory_total=$(echo "$memory_info" | awk '{print $2}')
        echo -e "  Memória: $memory_used / $memory_total"
    fi
    
    # Disk usage
    if command -v df >/dev/null 2>&1; then
        local disk_usage=$(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')
        echo -e "  Disco (/): $disk_usage"
    fi
    
    # Informações do servidor atual
    echo
    echo -e "${CYAN}=== Servidor Atual ===${NC}"
    echo -e "  Hostname: $(hostname 2>/dev/null || echo 'N/A')"
    
    # IP local
    local local_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || ip route get 1 2>/dev/null | awk '{print $7}' | head -1 || echo 'N/A')
    echo -e "  IP Local: $local_ip"
    
    # Tentar obter estatísticas básicas da API sem autenticação
    echo
    echo -e "${YELLOW}Obtendo estatísticas básicas...${NC}"
    local basic_stats=$(curl -s --connect-timeout 5 --max-time 10 "http://localhost:5001/api/stats" 2>/dev/null)
    
    if [[ -n "$basic_stats" ]]; then
        if command -v jq >/dev/null 2>&1; then
            # Parse com jq
            local total_users=$(echo "$basic_stats" | jq -r '.users // 0' 2>/dev/null)
            local total_domains=$(echo "$basic_stats" | jq -r '.domains // 0' 2>/dev/null)
            local total_requests=$(echo "$basic_stats" | jq -r '.requests // 0' 2>/dev/null)
            local total_servers=$(echo "$basic_stats" | jq -r '.servers // 1' 2>/dev/null)
            
            echo -e "${GREEN}✓ Estatísticas básicas obtidas${NC}"
            echo -e "  Usuários: $total_users"
            echo -e "  Domínios: $total_domains"
            echo -e "  Requisições: $total_requests"
            echo -e "  Servidores: $total_servers"
        else
            # Fallback sem jq
            local total_users=$(echo "$basic_stats" | grep -o '"users":[0-9]*' | cut -d: -f2 || echo "N/A")
            local total_domains=$(echo "$basic_stats" | grep -o '"domains":[0-9]*' | cut -d: -f2 || echo "N/A")
            local total_requests=$(echo "$basic_stats" | grep -o '"requests":[0-9]*' | cut -d: -f2 || echo "N/A")
            local total_servers=$(echo "$basic_stats" | grep -o '"servers":[0-9]*' | cut -d: -f2 || echo "1")
            
            echo -e "${GREEN}✓ Estatísticas básicas obtidas${NC}"
            echo -e "  Usuários: $total_users"
            echo -e "  Domínios: $total_domains"
            echo -e "  Requisições: $total_requests"
            echo -e "  Servidores: $total_servers"
        fi
    else
        echo -e "${RED}✗ Não foi possível obter estatísticas básicas${NC}"
    fi
    
    # Notas sobre funcionalidades avançadas
    echo
    echo -e "${YELLOW}=== Notas ===${NC}"
    echo -e "  💡 Para estatísticas detalhadas de performance, use autenticação de superadmin"
    echo -e "  🖥️  Para dados completos de múltiplos servidores, use autenticação de superadmin"
    echo -e "  🔧 Para instalar jq (melhor parsing): apt-get install jq"
}

# Função para configurar parâmetros
configure_parameters() {
    echo -e "${CYAN}⚙️  CONFIGURAÇÃO DE PARÂMETROS${NC}"
    echo "────────────────────────────────────────────────────────────────────────────────────────"
    echo ""
    
    echo -e "${YELLOW}Configurações atuais:${NC}"
    echo "  Intervalo de atualização: ${REFRESH_INTERVAL}s"
    echo "  Linhas de log: ${LOG_LINES}"
    echo "  Alerta CPU: ${ALERT_THRESHOLD_CPU}%"
    echo "  Alerta Memória: ${ALERT_THRESHOLD_MEM}%"
    echo ""
    
    read -p "Novo intervalo de atualização (atual: ${REFRESH_INTERVAL}s): " new_interval
    if [[ "$new_interval" =~ ^[0-9]+$ ]] && [ "$new_interval" -gt 0 ]; then
        REFRESH_INTERVAL=$new_interval
        success "Intervalo atualizado para ${REFRESH_INTERVAL}s"
    fi
    
    read -p "Número de linhas de log (atual: ${LOG_LINES}): " new_log_lines
    if [[ "$new_log_lines" =~ ^[0-9]+$ ]] && [ "$new_log_lines" -gt 0 ]; then
        LOG_LINES=$new_log_lines
        success "Linhas de log atualizadas para ${LOG_LINES}"
    fi
    
    read -p "Limite de alerta CPU % (atual: ${ALERT_THRESHOLD_CPU}): " new_cpu_threshold
    if [[ "$new_cpu_threshold" =~ ^[0-9]+$ ]] && [ "$new_cpu_threshold" -gt 0 ] && [ "$new_cpu_threshold" -le 100 ]; then
        ALERT_THRESHOLD_CPU=$new_cpu_threshold
        success "Alerta CPU atualizado para ${ALERT_THRESHOLD_CPU}%"
    fi
    
    read -p "Limite de alerta Memória % (atual: ${ALERT_THRESHOLD_MEM}): " new_mem_threshold
    if [[ "$new_mem_threshold" =~ ^[0-9]+$ ]] && [ "$new_mem_threshold" -gt 0 ] && [ "$new_mem_threshold" -le 100 ]; then
        ALERT_THRESHOLD_MEM=$new_mem_threshold
        success "Alerta Memória atualizado para ${ALERT_THRESHOLD_MEM}%"
    fi
    
    # Salvar configurações
    save_config
    
    echo ""
    echo -e "${GREEN}✅ Configurações salvas com sucesso!${NC}"
    echo ""
    read -p "Pressione Enter para continuar..."
}

# Função para reiniciar serviços
restart_services() {
    echo -e "${YELLOW}🔄 Reiniciando serviços do backend...${NC}"
    echo ""
    
    echo "Reiniciando Backend..."
    docker restart cdnproxy-backend
    sleep 2
    
    echo "Reiniciando Redis..."
    docker restart cdnproxy-redis
    sleep 3
    
    echo ""
    echo -e "${GREEN}✅ Serviços reiniciados com sucesso!${NC}"
}

# Função de monitoramento contínuo (modo legado)
continuous_monitor() {
    trap 'echo -e "\n${YELLOW}Monitoramento interrompido${NC}"; return 0' INT
    
    echo -e "${CYAN}Monitoramento contínuo iniciado (30s)...${NC}"
    echo -e "${YELLOW}Pressione Ctrl+C para parar${NC}"
    
    while true; do
        echo ""
        echo -e "${BLUE}=== $(date) ===${NC}"
        
        check_redis_advanced
        check_supabase_advanced
        check_service_advanced "Backend" "http://localhost:5001/api/health" "cdnproxy-backend"
        
        echo ""
        echo -e "${PURPLE}Próxima verificação em 30 segundos...${NC}"
        sleep 30
    done
}

# Loop principal
main() {
    # Carregar configurações
    load_config
    
    # Verificar dependências
    if ! command -v docker &> /dev/null; then
        critical_alert "Docker não está instalado ou não está no PATH"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        warn "bc não está instalado. Algumas métricas de tempo podem não funcionar corretamente."
    fi
    
    while true; do
        clear
        show_menu
        
        case $choice in
            1)
                echo -e "${CYAN}🔍 Verificando status dos serviços...${NC}"
                echo ""
                check_redis_advanced
                check_supabase_advanced
                check_service_advanced "Backend" "http://localhost:5001/api/health" "cdnproxy-backend"
                echo ""
                read -p "Pressione Enter para continuar..."
                ;;
            2)
                echo ""
                read -p "Intervalo de atualização em segundos (padrão: ${REFRESH_INTERVAL}): " custom_interval
                if [[ "$custom_interval" =~ ^[0-9]+$ ]] && [ "$custom_interval" -gt 0 ]; then
                    realtime_monitor_backend "$custom_interval"
                else
                    realtime_monitor_backend
                fi
                ;;
            3)
                echo -e "${YELLOW}Iniciando monitoramento contínuo (modo legado)...${NC}"
                continuous_monitor
                ;;
            4)
                show_stats
                echo ""
                read -p "Pressione Enter para continuar..."
                ;;
            5)
                show_logs
                echo ""
                read -p "Pressione Enter para continuar..."
                ;;
            6)
                show_db_stats
                echo ""
                read -p "Pressione Enter para continuar..."
                ;;
            7)
                configure_parameters
                ;;
            8)
                echo -e "${YELLOW}Reiniciando serviços...${NC}"
                restart_services
                echo ""
                read -p "Pressione Enter para continuar..."
                ;;
            0)
                echo -e "${GREEN}👋 Saindo do monitor...${NC}"
                exit 0
                ;;
            *)
                error "Opção inválida. Tente novamente."
                sleep 2
                ;;
        esac
    done
}

# Inicializar o script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi