#!/bin/bash

# Script de Monitoramento - CDNProxy
# Monitora a saúde dos serviços em produção

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Função para verificar serviço
check_service() {
    local service_name=$1
    local url=$2
    local container_name=$3
    
    echo -n "Verificando $service_name... "
    
    # Verificar se o container está rodando
    if ! docker ps | grep -q "$container_name"; then
        error "$service_name: Container não está rodando"
        return 1
    fi
    
    # Verificar endpoint HTTP
    if curl -f -s "$url" > /dev/null 2>&1; then
        log "$service_name: ✅ OK"
        return 0
    else
        error "$service_name: ❌ Endpoint não responde"
        return 1
    fi
}

# Função para verificar Redis
check_redis() {
    echo -n "Verificando Redis... "
    
    if ! docker ps | grep -q "cdnproxy-redis-prod"; then
        error "Redis: Container não está rodando"
        return 1
    fi
    
    if docker exec cdnproxy-redis-prod redis-cli ping > /dev/null 2>&1; then
        log "Redis: ✅ OK"
        return 0
    else
        error "Redis: ❌ Não responde"
        return 1
    fi
}

# Função para mostrar estatísticas
show_stats() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "           Estatísticas do Sistema"
    echo "=================================================="
    echo -e "${NC}"
    
    # Uso de CPU e Memória dos containers
    echo "📊 Uso de recursos dos containers:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep cdnproxy
    
    echo ""
    echo "💾 Uso de disco:"
    df -h | grep -E "(Filesystem|/dev/)"
    
    echo ""
    echo "🐳 Status dos containers:"
    docker-compose -f docker-compose.prod.yml ps
}

# Função para mostrar logs recentes
show_recent_logs() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "              Logs Recentes"
    echo "=================================================="
    echo -e "${NC}"
    
    echo "📝 Proxy (últimas 10 linhas):"
    docker logs cdnproxy-proxy-prod --tail 10
    
    echo ""
    echo "📝 Backend (últimas 5 linhas):"
    docker logs cdnproxy-backend-prod --tail 5
}

# Menu principal
show_menu() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "        CDNProxy - Monitor de Produção"
    echo "=================================================="
    echo -e "${NC}"
    echo "1. Verificar saúde dos serviços"
    echo "2. Mostrar estatísticas do sistema"
    echo "3. Mostrar logs recentes"
    echo "4. Monitoramento contínuo (30s)"
    echo "5. Reiniciar serviços"
    echo "6. Sair"
    echo ""
    read -p "Escolha uma opção (1-6): " choice
}

# Função de monitoramento contínuo
continuous_monitor() {
    echo "🔄 Iniciando monitoramento contínuo (pressione Ctrl+C para parar)..."
    
    while true; do
        clear
        echo -e "${BLUE}CDNProxy - Monitoramento Contínuo - $(date)${NC}"
        echo "=================================================="
        
        check_redis
        check_service "Proxy" "http://localhost:8080/health" "cdnproxy-proxy-prod"
        check_service "Backend" "http://localhost:5001/api/health" "cdnproxy-backend-prod"
        
        echo ""
        echo "📊 Recursos:"
        docker stats --no-stream --format "{{.Container}}: CPU {{.CPUPerc}} | MEM {{.MemUsage}}" | grep cdnproxy
        
        echo ""
        echo "⏰ Próxima verificação em 30 segundos..."
        sleep 30
    done
}

# Função para reiniciar serviços
restart_services() {
    echo "🔄 Reiniciando serviços..."
    docker-compose -f docker-compose.prod.yml restart
    sleep 10
    log "Serviços reiniciados!"
}

# Loop principal
while true; do
    show_menu
    
    case $choice in
        1)
            echo ""
            log "Verificando saúde dos serviços..."
            check_redis
            check_service "Proxy" "http://localhost:8080/health" "cdnproxy-proxy-prod"
            check_service "Backend" "http://localhost:5001/api/health" "cdnproxy-backend-prod"
            echo ""
            read -p "Pressione Enter para continuar..."
            ;;
        2)
            clear
            show_stats
            echo ""
            read -p "Pressione Enter para continuar..."
            ;;
        3)
            clear
            show_recent_logs
            echo ""
            read -p "Pressione Enter para continuar..."
            ;;
        4)
            continuous_monitor
            ;;
        5)
            restart_services
            read -p "Pressione Enter para continuar..."
            ;;
        6)
            log "Saindo do monitor..."
            exit 0
            ;;
        *)
            warn "Opção inválida!"
            sleep 2
            ;;
    esac
    
    clear
done