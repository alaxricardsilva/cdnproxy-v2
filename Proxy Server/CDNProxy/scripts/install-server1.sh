#!/bin/bash

# =============================================================================
# Script de Instalação - Servidor 1 (Frontend)
# CDN Proxy - app.cdnproxy.top
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

log "Iniciando instalação do CDN Proxy - Servidor 1 (Frontend)"

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

# Criar arquivo docker-compose específico para servidor 1
log "Criando configuração Docker para Servidor 1..."
cat > "$PROJECT_DIR/docker-compose.server1.yml" << 'EOF'
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: proxycdn-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=3000
    env_file:
      - ./frontend/.env.production
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    networks:
      - proxycdn-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  proxy-server:
    build:
      context: .
      dockerfile: Dockerfile.proxy
    container_name: proxycdn-proxy
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PROXY_PORT=8080
      - FRONTEND_URL=http://frontend:3000
      - BACKEND_URL=https://api.cdnproxy.top
    volumes:
      - ./proxy-server.js:/app/proxy-server.js:ro
      - ./package.json:/app/package.json:ro
    depends_on:
      - frontend
    networks:
      - proxycdn-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  redis:
    image: redis:7-alpine
    container_name: proxycdn-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass L4JPcDDbNxKxyK8b --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - proxycdn-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
    driver: local

networks:
  proxycdn-network:
    driver: bridge
EOF

# Criar Dockerfile para o proxy se não existir
if [ ! -f "$PROJECT_DIR/Dockerfile.proxy" ]; then
    log "Criando Dockerfile para o proxy-server..."
    cat > "$PROJECT_DIR/Dockerfile.proxy" << 'EOF'
FROM node:18-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package.json ./
RUN npm install --only=production

# Copiar o proxy server
COPY proxy-server.js ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S proxyuser -u 1001
USER proxyuser

# Expor porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Comando de inicialização
CMD ["node", "proxy-server.js"]
EOF
fi

# Criar Dockerfile para o frontend se não existir
if [ ! -f "$PROJECT_DIR/frontend/Dockerfile" ]; then
    log "Criando Dockerfile para o frontend..."
    cat > "$PROJECT_DIR/frontend/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
EOF
fi

# Verificar se as configurações de ambiente existem
if [ ! -f "$PROJECT_DIR/frontend/.env.production" ]; then
    error "Arquivo .env.production não encontrado no frontend. Execute a análise primeiro."
fi

# Parar containers existentes
log "Parando containers existentes..."
cd "$PROJECT_DIR"
docker-compose -f docker-compose.server1.yml down 2>/dev/null || true

# Construir e iniciar containers
log "Construindo e iniciando containers..."
docker-compose -f docker-compose.server1.yml up -d --build

# Aguardar containers ficarem saudáveis
log "Aguardando containers ficarem saudáveis..."
sleep 30

# Verificar status dos containers
log "Verificando status dos containers..."
docker-compose -f docker-compose.server1.yml ps

# Verificar se o frontend está respondendo
log "Testando conectividade do frontend..."
for i in {1..10}; do
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        log "Frontend está respondendo corretamente!"
        break
    fi
    if [ $i -eq 10 ]; then
        error "Frontend não está respondendo após 10 tentativas"
    fi
    info "Tentativa $i/10 - Aguardando frontend..."
    sleep 5
done

# Verificar se o proxy está respondendo
log "Testando conectividade do proxy-server..."
for i in {1..10}; do
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log "Proxy-server está respondendo corretamente!"
        break
    fi
    if [ $i -eq 10 ]; then
        warning "Proxy-server não está respondendo após 10 tentativas"
    fi
    info "Tentativa $i/10 - Aguardando proxy-server..."
    sleep 5
done

# Configurar Nginx no aaPanel
log "Configurações do Nginx para aaPanel:"
info "1. Acesse o painel do aaPanel"
info "2. Vá em Website > Add site"
info "3. Configure o domínio: app.cdnproxy.top"
info "4. Copie o conteúdo de nginx/nginx.server1.conf para a configuração do site"
info "5. Configure SSL/TLS para o domínio"

# Mostrar logs dos containers
log "Últimas linhas dos logs:"
docker-compose -f docker-compose.server1.yml logs --tail=20

# Informações finais
log "=== INSTALAÇÃO CONCLUÍDA ==="
info "Frontend: http://localhost:3000"
info "Proxy Server: http://localhost:8080"
info "Redis: localhost:6379"
info "Logs: docker-compose -f docker-compose.server1.yml logs -f"
info "Parar: docker-compose -f docker-compose.server1.yml down"
info "Reiniciar: docker-compose -f docker-compose.server1.yml restart"

log "Configure o Nginx no aaPanel conforme as instruções acima."
log "Instalação do Servidor 1 concluída com sucesso!"
EOF