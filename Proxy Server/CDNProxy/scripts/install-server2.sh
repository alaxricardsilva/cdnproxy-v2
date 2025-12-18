#!/bin/bash

# =============================================================================
# Script de Instalação - Servidor 2 (Backend)
# CDN Proxy - api.cdnproxy.top
# =============================================================================

set -e  # Parar em caso de erro

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

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root"
fi

# Verificar se o aaPanel está instalado
if ! command -v bt &> /dev/null; then
    error "aaPanel não encontrado. Instale o aaPanel primeiro."
fi

log "Iniciando instalação do CDN Proxy - Servidor 2 (Backend)"

# Definir diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log "Diretório do projeto: $PROJECT_DIR"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    warning "Docker não encontrado. Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    log "Docker instalado com sucesso"
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    warning "Docker Compose não encontrado. Instalando..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log "Docker Compose instalado com sucesso"
fi

# Criar arquivo docker-compose específico para servidor 2
log "Criando configuração Docker para Servidor 2..."
cat > "$PROJECT_DIR/docker-compose.server2.yml" << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: proxycdn-backend
    restart: unless-stopped
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=5001
      - NITRO_PORT=5001
    env_file:
      - ./backend/.env.production
    volumes:
      - ./backend:/app
      - /app/node_modules
      - /app/.nuxt
      - /app/.output
    networks:
      - proxycdn-network
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    container_name: proxycdn-redis-backend
    restart: unless-stopped
    ports:
      - "6380:6379"  # Porta diferente para evitar conflito
    command: redis-server --requirepass L4JPcDDbNxKxyK8b --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - proxycdn-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis-insight:
    image: redislabs/redisinsight:latest
    container_name: proxycdn-redis-insight
    restart: unless-stopped
    ports:
      - "8001:8001"
    environment:
      - RIPORT=8001
    volumes:
      - redis_insight_data:/db
    networks:
      - proxycdn-network
    depends_on:
      - redis

volumes:
  redis_data:
    driver: local
  redis_insight_data:
    driver: local

networks:
  proxycdn-network:
    driver: bridge
EOF

# Criar Dockerfile para o backend se não existir
if [ ! -f "$PROJECT_DIR/backend/Dockerfile" ]; then
    log "Criando Dockerfile para o backend..."
    cat > "$PROJECT_DIR/backend/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache curl

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 5001

# Comando de inicialização
CMD ["npm", "start"]
EOF
fi

# Verificar se as configurações de ambiente existem
if [ ! -f "$PROJECT_DIR/backend/.env.production" ]; then
    error "Arquivo .env.production não encontrado no backend. Execute a análise primeiro."
fi

# Parar containers existentes
log "Parando containers existentes..."
cd "$PROJECT_DIR"
docker-compose -f docker-compose.server2.yml down 2>/dev/null || true

# Construir e iniciar containers
log "Construindo e iniciando containers..."
docker-compose -f docker-compose.server2.yml up -d --build

# Aguardar containers ficarem saudáveis
log "Aguardando containers ficarem saudáveis..."
sleep 30

# Verificar status dos containers
log "Verificando status dos containers..."
docker-compose -f docker-compose.server2.yml ps

# Verificar se o backend está respondendo
log "Testando conectividade do backend..."
for i in {1..10}; do
    if curl -f http://localhost:5001/api/health >/dev/null 2>&1; then
        log "Backend está respondendo corretamente!"
        break
    fi
    if [ $i -eq 10 ]; then
        error "Backend não está respondendo após 10 tentativas"
    fi
    info "Tentativa $i/10 - Aguardando backend..."
    sleep 5
done

# Testar APIs específicas
log "Testando APIs específicas..."
info "Testando API de streaming..."
curl -X POST http://localhost:5001/api/streaming/queue-status -H "Content-Type: application/json" -d '{}' || warning "API de streaming pode não estar totalmente configurada"

# Configurar Nginx no aaPanel
log "Configurações do Nginx para aaPanel:"
info "1. Acesse o painel do aaPanel"
info "2. Vá em Website > Add site"
info "3. Configure o domínio: api.cdnproxy.top"
info "4. Copie o conteúdo de nginx/nginx.server2.conf para a configuração do site"
info "5. Configure SSL/TLS para o domínio"

# Mostrar logs dos containers
log "Últimas linhas dos logs:"
docker-compose -f docker-compose.server2.yml logs --tail=20

# Configurar firewall (se necessário)
log "Configurações de firewall recomendadas:"
info "sudo ufw allow 5001/tcp  # Backend API"
info "sudo ufw allow 6380/tcp  # Redis (se acesso externo necessário)"
info "sudo ufw allow 8001/tcp  # Redis Insight (opcional)"

# Informações finais
log "=== INSTALAÇÃO CONCLUÍDA ==="
info "Backend API: http://localhost:5001"
info "Redis: localhost:6380"
info "Redis Insight: http://localhost:8001"
info "Logs: docker-compose -f docker-compose.server2.yml logs -f"
info "Parar: docker-compose -f docker-compose.server2.yml down"
info "Reiniciar: docker-compose -f docker-compose.server2.yml restart"

log "Configure o Nginx no aaPanel conforme as instruções acima."
log "Instalação do Servidor 2 concluída com sucesso!"

# Mostrar informações de monitoramento
log "=== MONITORAMENTO ==="
info "Para monitorar o sistema:"
info "1. Acesse Redis Insight em http://localhost:8001"
info "2. Configure conexão Redis: localhost:6380, senha: L4JPcDDbNxKxyK8b"
info "3. Monitore logs: docker-compose -f docker-compose.server2.yml logs -f backend"
info "4. Verifique saúde: curl http://localhost:5001/api/health"
EOF