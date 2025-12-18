#!/bin/bash

# Menu Principal - CDN Proxy Docker Management
# Sistema de Streaming IPTV

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║                                                       ║"
    echo "║          🚀 CDN PROXY - DOCKER MANAGER 🚀            ║"
    echo "║                                                       ║"
    echo "║            Sistema de Streaming IPTV                 ║"
    echo "║                                                       ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Menu Principal
show_menu() {
    echo -e "${BLUE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  MENU PRINCIPAL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
    echo -e "${GREEN}1)${NC} 🚀 Rebuild Completo (Recomendado)"
    echo -e "${GREEN}2)${NC} 📊 Ver Status dos Containers"
    echo -e "${GREEN}3)${NC} 📋 Ver Logs em Tempo Real"
    echo -e "${GREEN}4)${NC} 🔄 Reiniciar Containers"
    echo -e "${GREEN}5)${NC} 🛑 Parar Containers"
    echo -e "${GREEN}6)${NC} ▶️  Iniciar Containers"
    echo -e "${GREEN}7)${NC} 🧹 Limpar Tudo (Cuidado!)"
    echo -e "${GREEN}8)${NC} 🔍 Testar Conectividade"
    echo -e "${GREEN}9)${NC} 🐳 Push para Docker Hub"
    echo -e "${GREEN}10)${NC} 📖 Ver Guia de Uso"
    echo -e "${RED}0)${NC} ❌ Sair"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Função para pausar
pause() {
    echo ""
    read -p "Pressione ENTER para continuar..."
}

# 1. Rebuild Completo
rebuild_complete() {
    show_banner
    echo -e "${GREEN}🚀 Iniciando Rebuild Completo...${NC}"
    echo ""
    chmod +x rebuild-docker.sh
    ./rebuild-docker.sh
    pause
}

# 2. Ver Status
view_status() {
    show_banner
    echo -e "${GREEN}📊 Status dos Containers:${NC}"
    echo ""
    docker-compose -f docker-compose.server2.yml ps
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Saúde dos Containers:${NC}"
    echo ""
    docker inspect cdnproxy-frontend | grep -A 5 "Health" 2>/dev/null || echo "Container frontend não encontrado"
    echo ""
    docker inspect cdnproxy-proxy | grep -A 5 "Health" 2>/dev/null || echo "Container proxy não encontrado"
    pause
}

# 3. Ver Logs
view_logs() {
    show_banner
    echo -e "${GREEN}📋 Selecione qual log deseja ver:${NC}"
    echo ""
    echo "1) Todos os logs"
    echo "2) Apenas Frontend"
    echo "3) Apenas Proxy"
    echo "4) Voltar"
    echo ""
    read -p "Opção: " log_option
    
    case $log_option in
        1)
            echo -e "${BLUE}Mostrando todos os logs (Ctrl+C para sair)...${NC}"
            docker-compose -f docker-compose.server2.yml logs -f
            ;;
        2)
            echo -e "${BLUE}Mostrando logs do Backend (Ctrl+C para sair)...${NC}"
            docker-compose -f docker-compose.server2.yml logs -f backend
            ;;
        3)
            echo -e "${BLUE}Mostrando logs do Redis (Ctrl+C para sair)...${NC}"
            docker-compose -f docker-compose.server2.yml logs -f redis
            ;;
        4)
            return
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            pause
            ;;
    esac
}

# 4. Reiniciar
restart_containers() {
    show_banner
    echo -e "${YELLOW}🔄 Reiniciando containers...${NC}"
    docker-compose -f docker-compose.server2.yml restart
    echo -e "${GREEN}✅ Containers reiniciados!${NC}"
    pause
}

# 5. Parar
stop_containers() {
    show_banner
    echo -e "${RED}🛑 Parando containers...${NC}"
    docker-compose -f docker-compose.server2.yml down
    echo -e "${GREEN}✅ Containers parados!${NC}"
    pause
}

# 6. Iniciar
start_containers() {
    show_banner
    echo -e "${GREEN}▶️  Iniciando containers...${NC}"
    docker-compose -f docker-compose.server2.yml up -d
    echo -e "${GREEN}✅ Containers iniciados!${NC}"
    pause
}

# 7. Limpar Tudo
clean_all() {
    show_banner
    echo -e "${RED}⚠️  ATENÇÃO: Esta ação irá remover TUDO!${NC}"
    echo ""
    read -p "Digite 'CONFIRMAR' para prosseguir: " confirm
    
    if [ "$confirm" == "CONFIRMAR" ]; then
        echo -e "${RED}🧹 Limpando tudo...${NC}"
        docker-compose -f docker-compose.server2.yml down --volumes --remove-orphans
        docker images | grep 'cdnproxy' | awk '{print $3}' | xargs -r docker rmi -f
        docker builder prune -f
        echo -e "${GREEN}✅ Limpeza concluída!${NC}"
    else
        echo -e "${BLUE}Operação cancelada.${NC}"
    fi
    pause
}

# 8. Testar Conectividade
test_connectivity() {
    show_banner
    echo -e "${GREEN}🔍 Testando conectividade...${NC}"
    echo ""
    
    # Teste Frontend
    echo -n "Frontend (porta 3000): "
    if curl -f -s https://app.cdnproxy.top > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FALHOU${NC}"
    fi
    
    # Teste Backend
    echo -n "Backend (API): "
    if curl -f -s https://api.cdnproxy.top > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FALHOU${NC}"
    fi
    
    # Teste Proxy
    echo -n "Proxy (porta 8080): "
    if curl -f -s https://proxy.cdnproxy.top/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FALHOU${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}URLs de Teste:${NC}"
    echo "  - Frontend: https://app.cdnproxy.top"
    echo "  - Backend API: https://api.cdnproxy.top"
    echo "  - Proxy Health: https://proxy.cdnproxy.top/health"
    echo "  - Aplicação: https://app.cdnproxy.top"
    pause
}

# 9. Push para Docker Hub
push_docker_hub() {
    show_banner
    echo -e "${GREEN}🐳 Push para Docker Hub${NC}"
    echo ""
    
    DOCKER_USERNAME="alaxricard"
    
    # Verificar se já está logado
    echo -e "${BLUE}Verificando login no Docker Hub...${NC}"
    if docker info 2>/dev/null | grep -q "Username: $DOCKER_USERNAME"; then
        echo -e "${GREEN}✅ Já está logado como $DOCKER_USERNAME${NC}"
    else
        echo -e "${YELLOW}⚠️  Não está logado. Iniciando processo de login...${NC}"
        echo ""
        echo -e "${CYAN}Opções de login:${NC}"
        echo "1) Login com senha"
        echo "2) Login com Personal Access Token (PAT) - Recomendado"
        echo "3) Cancelar"
        echo ""
        read -p "Escolha uma opção: " login_option
        
        case $login_option in
            1)
                echo -e "${YELLOW}Digite sua senha:${NC}"
                docker login -u $DOCKER_USERNAME
                ;;
            2)
                echo -e "${CYAN}ℹ️  Como criar um PAT:${NC}"
                echo "   1. Acesse: https://app.docker.com/settings/personal-access-tokens"
                echo "   2. Clique em 'Generate New Token'"
                echo "   3. Copie o token gerado"
                echo ""
                echo -e "${YELLOW}Cole seu Personal Access Token (PAT):${NC}"
                read -s PAT_TOKEN
                echo ""
                echo $PAT_TOKEN | docker login -u $DOCKER_USERNAME --password-stdin
                ;;
            3)
                echo -e "${BLUE}Operação cancelada.${NC}"
                pause
                return
                ;;
            *)
                echo -e "${RED}Opção inválida!${NC}"
                pause
                return
                ;;
        esac
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro ao fazer login no Docker Hub${NC}"
        pause
        return
    fi
    
    echo ""
    echo -e "${GREEN}✅ Login realizado com sucesso!${NC}"
    echo ""
    
    # Verificar se as imagens existem localmente
    echo -e "${BLUE}Verificando imagens locais...${NC}"
    
    FRONTEND_EXISTS=$(docker images | grep "cdnproxy-frontend" | grep "latest" | wc -l)
    PROXY_EXISTS=$(docker images | grep "cdnproxy-proxy" | grep "latest" | wc -l)
    
    if [ $FRONTEND_EXISTS -eq 0 ] && [ $PROXY_EXISTS -eq 0 ]; then
        echo -e "${RED}❌ Nenhuma imagem encontrada localmente!${NC}"
        echo -e "${YELLOW}Execute primeiro o rebuild completo (opção 1)${NC}"
        pause
        return
    fi
    
    echo -e "${GREEN}✅ Imagens encontradas:${NC}"
    [ $FRONTEND_EXISTS -gt 0 ] && echo "   - cdnproxy-frontend:latest"
    [ $PROXY_EXISTS -gt 0 ] && echo "   - cdnproxy-proxy:latest"
    echo ""
    
    echo -e "${BLUE}Criando tags...${NC}"
    
    # Tag Frontend
    if [ $FRONTEND_EXISTS -gt 0 ]; then
        echo -e "${YELLOW}Tagging frontend...${NC}"
        docker tag cdnproxy-frontend:latest $DOCKER_USERNAME/cdnproxy-frontend:latest
        docker tag cdnproxy-frontend:latest $DOCKER_USERNAME/cdnproxy-frontend:v2.0.2
        echo -e "${GREEN}✅ Frontend tagged${NC}"
    fi
    
    # Tag Proxy
    if [ $PROXY_EXISTS -gt 0 ]; then
        echo -e "${YELLOW}Tagging proxy...${NC}"
        docker tag cdnproxy-proxy:latest $DOCKER_USERNAME/cdnproxy-proxy:latest
        docker tag cdnproxy-proxy:latest $DOCKER_USERNAME/cdnproxy-proxy:v2.0.2
        echo -e "${GREEN}✅ Proxy tagged${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Fazendo push das imagens...${NC}"
    echo -e "${YELLOW}⏳ Este processo pode levar alguns minutos...${NC}"
    echo ""
    
    PUSH_SUCCESS=true
    
    # Push Frontend
    if [ $FRONTEND_EXISTS -gt 0 ]; then
        echo -e "${CYAN}📤 Pushing frontend:latest...${NC}"
        if docker push $DOCKER_USERNAME/cdnproxy-frontend:latest; then
            echo -e "${GREEN}✅ frontend:latest pushed${NC}"
        else
            echo -e "${RED}❌ Erro ao fazer push de frontend:latest${NC}"
            PUSH_SUCCESS=false
        fi
        
        echo -e "${CYAN}📤 Pushing frontend:v2.0.2...${NC}"
        if docker push $DOCKER_USERNAME/cdnproxy-frontend:v2.0.2; then
            echo -e "${GREEN}✅ frontend:v2.0.2 pushed${NC}"
        else
            echo -e "${RED}❌ Erro ao fazer push de frontend:v2.0.2${NC}"
            PUSH_SUCCESS=false
        fi
    fi
    
    echo ""
    
    # Push Proxy
    if [ $PROXY_EXISTS -gt 0 ]; then
        echo -e "${CYAN}📤 Pushing proxy:latest...${NC}"
        if docker push $DOCKER_USERNAME/cdnproxy-proxy:latest; then
            echo -e "${GREEN}✅ proxy:latest pushed${NC}"
        else
            echo -e "${RED}❌ Erro ao fazer push de proxy:latest${NC}"
            PUSH_SUCCESS=false
        fi
        
        echo -e "${CYAN}📤 Pushing proxy:v2.0.2...${NC}"
        if docker push $DOCKER_USERNAME/cdnproxy-proxy:v2.0.2; then
            echo -e "${GREEN}✅ proxy:v2.0.2 pushed${NC}"
        else
            echo -e "${RED}❌ Erro ao fazer push de proxy:v2.0.2${NC}"
            PUSH_SUCCESS=false
        fi
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ "$PUSH_SUCCESS" = true ]; then
        echo -e "${GREEN}🎉 Push concluído com sucesso!${NC}"
        echo ""
        echo -e "${BLUE}📦 Imagens disponíveis no Docker Hub:${NC}"
        if [ $FRONTEND_EXISTS -gt 0 ]; then
            echo -e "${CYAN}Frontend:${NC}"
            echo "  - docker pull $DOCKER_USERNAME/cdnproxy-frontend:latest"
            echo "  - docker pull $DOCKER_USERNAME/cdnproxy-frontend:v2.0.2"
        fi
        if [ $PROXY_EXISTS -gt 0 ]; then
            echo -e "${CYAN}Proxy:${NC}"
            echo "  - docker pull $DOCKER_USERNAME/cdnproxy-proxy:latest"
            echo "  - docker pull $DOCKER_USERNAME/cdnproxy-proxy:v2.0.2"
        fi
        echo ""
        echo -e "${GREEN}🌐 Acesse: https://hub.docker.com/u/$DOCKER_USERNAME${NC}"
    else
        echo -e "${RED}⚠️  Push concluído com alguns erros${NC}"
        echo -e "${YELLOW}Verifique as mensagens acima para mais detalhes${NC}"
    fi
    
    pause
}

# 10. Ver Guia
view_guide() {
    show_banner
    if [ -f "GUIA_REBUILD_DOCKER.md" ]; then
        cat GUIA_REBUILD_DOCKER.md | less
    else
        echo -e "${RED}❌ Guia não encontrado!${NC}"
    fi
    pause
}

# Loop Principal
while true; do
    show_banner
    show_menu
    read -p "Escolha uma opção: " option
    
    case $option in
        1) rebuild_complete ;;
        2) view_status ;;
        3) view_logs ;;
        4) restart_containers ;;
        5) stop_containers ;;
        6) start_containers ;;
        7) clean_all ;;
        8) test_connectivity ;;
        9) push_docker_hub ;;
        10) view_guide ;;
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
