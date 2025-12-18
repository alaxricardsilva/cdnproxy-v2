#!/bin/bash

# Menu Principal - CDN Proxy Docker Management (Backend Server2)
# Sistema de Backend API + Redis

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
COMPOSE_FILE="docker-compose.server2.yml"
DOCKER_USERNAME="alaxricard"

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║       🚀 CDN PROXY - BACKEND DOCKER MANAGER 🚀       ║"
    echo "║                                                       ║"
    echo "║            Backend API + Redis Manager               ║"
    echo "║                    Server 2                          ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Menu Principal
show_menu() {
    echo -e "${BLUE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  MENU PRINCIPAL - BACKEND"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
    echo -e "${GREEN}1)${NC} 🚀 Build e Start (Build local e inicia)"
    echo -e "${GREEN}2)${NC} 🐳 Pull e Start (Baixa do Docker Hub e inicia)"
    echo -e "${GREEN}3)${NC} 📊 Ver Status dos Containers"
    echo -e "${GREEN}4)${NC} 📋 Ver Logs em Tempo Real"
    echo -e "${GREEN}5)${NC} 🔄 Reiniciar Containers"
    echo -e "${GREEN}6)${NC} 🛑 Parar Containers"
    echo -e "${GREEN}7)${NC} ▶️  Iniciar Containers"
    echo -e "${GREEN}8)${NC} 🧹 Limpar Tudo (Cuidado!)"
    echo -e "${GREEN}9)${NC} 🔍 Testar Conectividade"
    echo -e "${GREEN}10)${NC} 📤 Build e Push para Docker Hub"
    echo -e "${GREEN}11)${NC} 🔧 Rebuild Completo (Down + Build + Up)"
    echo -e "${GREEN}12)${NC} 📖 Ver Documentação"
    echo -e "${RED}0)${NC} ❌ Sair"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Função para pausar
pause() {
    echo ""
    read -p "Pressione ENTER para continuar..."
}

# 1. Build e Start
build_and_start() {
    show_banner
    echo -e "${GREEN}🚀 Build e Start (Build Local)${NC}"
    echo ""
    echo -e "${YELLOW}⏳ Fazendo build das imagens localmente...${NC}"
    docker-compose -f ${COMPOSE_FILE} build --no-cache
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build concluído!${NC}"
        echo ""
        echo -e "${BLUE}Iniciando containers...${NC}"
        docker-compose -f ${COMPOSE_FILE} up -d
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Containers iniciados com sucesso!${NC}"
            echo ""
            echo -e "${CYAN}Aguardando containers ficarem saudáveis...${NC}"
            sleep 10
            docker-compose -f ${COMPOSE_FILE} ps
        else
            echo -e "${RED}❌ Erro ao iniciar containers${NC}"
        fi
    else
        echo -e "${RED}❌ Erro no build${NC}"
    fi
    pause
}

# 2. Pull e Start
pull_and_start() {
    show_banner
    echo -e "${GREEN}🐳 Pull e Start (Docker Hub)${NC}"
    echo ""
    echo -e "${YELLOW}⏳ Baixando imagens do Docker Hub...${NC}"
    
    if [ -f "./docker-pull.sh" ]; then
        chmod +x ./docker-pull.sh
        ./docker-pull.sh
    else
        echo -e "${BLUE}Fazendo pull manual...${NC}"
        docker pull ${DOCKER_USERNAME}/cdnproxy-backend:latest
        docker pull ${DOCKER_USERNAME}/cdnproxy-redis:latest
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Pull concluído!${NC}"
        echo ""
        echo -e "${BLUE}Iniciando containers...${NC}"
        docker-compose -f ${COMPOSE_FILE} up -d
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Containers iniciados com sucesso!${NC}"
            echo ""
            echo -e "${CYAN}Aguardando containers ficarem saudáveis...${NC}"
            sleep 10
            docker-compose -f ${COMPOSE_FILE} ps
        else
            echo -e "${RED}❌ Erro ao iniciar containers${NC}"
        fi
    else
        echo -e "${RED}❌ Erro no pull${NC}"
    fi
    pause
}

# 3. Ver Status
view_status() {
    show_banner
    echo -e "${GREEN}📊 Status dos Containers:${NC}"
    echo ""
    docker-compose -f ${COMPOSE_FILE} ps
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Saúde dos Containers:${NC}"
    echo ""
    
    echo -e "${CYAN}Backend:${NC}"
    docker inspect cdnproxy-backend 2>/dev/null | grep -A 10 "Health" || echo "  Container não encontrado ou sem healthcheck"
    echo ""
    
    echo -e "${CYAN}Redis:${NC}"
    docker inspect cdnproxy-redis 2>/dev/null | grep -A 10 "Health" || echo "  Container não encontrado ou sem healthcheck"
    echo ""
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Recursos do Sistema:${NC}"
    docker stats --no-stream cdnproxy-backend cdnproxy-redis 2>/dev/null || echo "  Containers não estão rodando"
    
    pause
}

# 4. Ver Logs
view_logs() {
    show_banner
    echo -e "${GREEN}📋 Selecione qual log deseja ver:${NC}"
    echo ""
    echo "1) Todos os logs"
    echo "2) Apenas Backend"
    echo "3) Apenas Redis"
    echo "4) Backend - Últimas 100 linhas"
    echo "5) Redis - Últimas 100 linhas"
    echo "6) Voltar"
    echo ""
    read -p "Opção: " log_option
    
    case $log_option in
        1)
            echo -e "${BLUE}Mostrando todos os logs (Ctrl+C para sair)...${NC}"
            docker-compose -f ${COMPOSE_FILE} logs -f
            ;;
        2)
            echo -e "${BLUE}Mostrando logs do Backend (Ctrl+C para sair)...${NC}"
            docker-compose -f ${COMPOSE_FILE} logs -f backend
            ;;
        3)
            echo -e "${BLUE}Mostrando logs do Redis (Ctrl+C para sair)...${NC}"
            docker-compose -f ${COMPOSE_FILE} logs -f redis
            ;;
        4)
            echo -e "${BLUE}Últimas 100 linhas - Backend:${NC}"
            docker-compose -f ${COMPOSE_FILE} logs --tail=100 backend
            pause
            ;;
        5)
            echo -e "${BLUE}Últimas 100 linhas - Redis:${NC}"
            docker-compose -f ${COMPOSE_FILE} logs --tail=100 redis
            pause
            ;;
        6)
            return
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            pause
            ;;
    esac
}

# 5. Reiniciar
restart_containers() {
    show_banner
    echo -e "${YELLOW}🔄 Reiniciando containers...${NC}"
    docker-compose -f ${COMPOSE_FILE} restart
    echo -e "${GREEN}✅ Containers reiniciados!${NC}"
    echo ""
    sleep 5
    docker-compose -f ${COMPOSE_FILE} ps
    pause
}

# 6. Parar
stop_containers() {
    show_banner
    echo -e "${RED}🛑 Parando containers...${NC}"
    docker-compose -f ${COMPOSE_FILE} down
    echo -e "${GREEN}✅ Containers parados!${NC}"
    pause
}

# 7. Iniciar
start_containers() {
    show_banner
    echo -e "${GREEN}▶️  Iniciando containers...${NC}"
    docker-compose -f ${COMPOSE_FILE} up -d
    echo -e "${GREEN}✅ Containers iniciados!${NC}"
    echo ""
    sleep 5
    docker-compose -f ${COMPOSE_FILE} ps
    pause
}

# 8. Limpar Tudo
clean_all() {
    show_banner
    echo -e "${RED}⚠️  ATENÇÃO: Esta ação irá remover TUDO!${NC}"
    echo -e "${YELLOW}Isso inclui:${NC}"
    echo "  - Todos os containers (backend + redis)"
    echo "  - Volumes de dados do Redis"
    echo "  - Imagens Docker locais"
    echo "  - Cache de build"
    echo ""
    read -p "Digite 'CONFIRMAR' para prosseguir: " confirm
    
    if [ "$confirm" == "CONFIRMAR" ]; then
        echo -e "${RED}🧹 Limpando tudo...${NC}"
        
        echo -e "${YELLOW}1. Parando e removendo containers...${NC}"
        docker-compose -f ${COMPOSE_FILE} down --volumes --remove-orphans
        
        echo -e "${YELLOW}2. Removendo imagens...${NC}"
        docker images | grep -E 'cdnproxy-backend|cdnproxy-redis' | awk '{print $3}' | xargs -r docker rmi -f
        
        echo -e "${YELLOW}3. Limpando cache de build...${NC}"
        docker builder prune -f
        
        echo -e "${GREEN}✅ Limpeza concluída!${NC}"
    else
        echo -e "${BLUE}Operação cancelada.${NC}"
    fi
    pause
}

# 9. Testar Conectividade
test_connectivity() {
    show_banner
    echo -e "${GREEN}🔍 Testando conectividade...${NC}"
    echo ""
    
    # Teste Backend API
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Testando Backend API:${NC}"
    echo ""
    
    echo -n "  Health Check (porta 5001): "
    if curl -f -s https://api.cdnproxy.top/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        HEALTH_RESPONSE=$(curl -s https://api.cdnproxy.top/api/health)
        echo -e "${YELLOW}    Resposta: ${HEALTH_RESPONSE}${NC}"
    else
        echo -e "${RED}❌ FALHOU${NC}"
    fi
    
    echo -n "  Backend URL externa: "
    if curl -f -s https://api.cdnproxy.top > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FALHOU (verifique NGINX/SSL)${NC}"
    fi
    
    # Teste Redis
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Testando Redis:${NC}"
    echo ""
    
    echo -n "  Conectividade Redis (porta 6380): "
    if docker exec cdnproxy-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        REDIS_INFO=$(docker exec cdnproxy-redis redis-cli INFO server | grep redis_version)
        echo -e "${YELLOW}    ${REDIS_INFO}${NC}"
    else
        echo -e "${RED}❌ FALHOU${NC}"
    fi
    
    # Teste de comunicação interna
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Testando comunicação interna (Backend -> Redis):${NC}"
    echo ""
    
    echo -n "  Backend pode acessar Redis: "
    if docker exec cdnproxy-backend sh -c 'nc -z redis 6379' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FALHOU${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}URLs de Teste:${NC}"
    echo "  - Backend Local: https://api.cdnproxy.top/api/health"
    echo "  - Backend Público: https://api.cdnproxy.top"
    echo "  - Redis Local: localhost:6380"
    echo ""
    echo -e "${CYAN}Comandos úteis:${NC}"
    echo "  - Testar Backend: curl https://api.cdnproxy.top/api/health"
    echo "  - Testar Redis: docker exec cdnproxy-redis redis-cli ping"
    
    pause
}

# 10. Build e Push para Docker Hub
build_and_push() {
    show_banner
    echo -e "${GREEN}📤 Build e Push para Docker Hub${NC}"
    echo ""
    
    if [ -f "./docker-build-and-push.sh" ]; then
        chmod +x ./docker-build-and-push.sh
        echo -e "${BLUE}Executando script de build e push...${NC}"
        ./docker-build-and-push.sh
    else
        echo -e "${RED}❌ Script docker-build-and-push.sh não encontrado!${NC}"
        echo -e "${YELLOW}Execute este script na raiz do projeto.${NC}"
    fi
    
    pause
}

# 11. Rebuild Completo
rebuild_complete() {
    show_banner
    echo -e "${GREEN}🔧 Rebuild Completo${NC}"
    echo ""
    echo -e "${YELLOW}Este processo irá:${NC}"
    echo "  1. Parar e remover containers existentes"
    echo "  2. Fazer build das imagens do zero (--no-cache)"
    echo "  3. Iniciar os novos containers"
    echo ""
    read -p "Deseja continuar? (s/N): " confirm
    
    if [[ "$confirm" =~ ^[Ss]$ ]]; then
        echo -e "${BLUE}1. Parando containers...${NC}"
        docker-compose -f ${COMPOSE_FILE} down
        
        echo ""
        echo -e "${BLUE}2. Fazendo build completo (sem cache)...${NC}"
        echo -e "${YELLOW}⏳ Este processo pode levar alguns minutos...${NC}"
        docker-compose -f ${COMPOSE_FILE} build --no-cache
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${BLUE}3. Iniciando containers...${NC}"
            docker-compose -f ${COMPOSE_FILE} up -d
            
            if [ $? -eq 0 ]; then
                echo ""
                echo -e "${GREEN}✅ Rebuild completo concluído com sucesso!${NC}"
                echo ""
                echo -e "${CYAN}Aguardando containers ficarem saudáveis...${NC}"
                sleep 10
                docker-compose -f ${COMPOSE_FILE} ps
            else
                echo -e "${RED}❌ Erro ao iniciar containers${NC}"
            fi
        else
            echo -e "${RED}❌ Erro no build${NC}"
        fi
    else
        echo -e "${BLUE}Operação cancelada.${NC}"
    fi
    
    pause
}

# 12. Ver Documentação
view_documentation() {
    show_banner
    echo -e "${GREEN}📖 Documentação Disponível${NC}"
    echo ""
    echo -e "${CYAN}Selecione o documento:${NC}"
    echo ""
    echo "1) Guia Docker Hub (GUIA_DOCKER_HUB.md)"
    echo "2) Setup Docker Hub (DOCKER_HUB_SETUP.md)"
    echo "3) Resumo Docker Hub (RESUMO_DOCKER_HUB.md)"
    echo "4) Listar todos arquivos .md"
    echo "5) Voltar"
    echo ""
    read -p "Opção: " doc_option
    
    case $doc_option in
        1)
            if [ -f "GUIA_DOCKER_HUB.md" ]; then
                less GUIA_DOCKER_HUB.md
            else
                echo -e "${RED}❌ Arquivo não encontrado!${NC}"
                pause
            fi
            ;;
        2)
            if [ -f "DOCKER_HUB_SETUP.md" ]; then
                less DOCKER_HUB_SETUP.md
            else
                echo -e "${RED}❌ Arquivo não encontrado!${NC}"
                pause
            fi
            ;;
        3)
            if [ -f "RESUMO_DOCKER_HUB.md" ]; then
                less RESUMO_DOCKER_HUB.md
            else
                echo -e "${RED}❌ Arquivo não encontrado!${NC}"
                pause
            fi
            ;;
        4)
            echo -e "${BLUE}Documentos disponíveis:${NC}"
            ls -lh *.md 2>/dev/null || echo "Nenhum arquivo .md encontrado"
            pause
            ;;
        5)
            return
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            pause
            ;;
    esac
}

# Loop Principal
while true; do
    show_banner
    show_menu
    read -p "Escolha uma opção: " option
    
    case $option in
        1) build_and_start ;;
        2) pull_and_start ;;
        3) view_status ;;
        4) view_logs ;;
        5) restart_containers ;;
        6) stop_containers ;;
        7) start_containers ;;
        8) clean_all ;;
        9) test_connectivity ;;
        10) build_and_push ;;
        11) rebuild_complete ;;
        12) view_documentation ;;
        0) 
            echo -e "${BLUE}Saindo...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            pause
            ;;
    esac
done
