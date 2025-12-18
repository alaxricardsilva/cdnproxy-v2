#!/bin/bash

# Script de Deploy - Servidor Frontend CDN Proxy
# Versão: 1.0
# Data: $(date +%Y-%m-%d)

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configurações
CONTAINER_NAME="cdnproxy-frontend"
IMAGE_NAME="cdnproxy-frontend"
COMPOSE_FILE="docker-compose.frontend.yml"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado!"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado!"
    exit 1
fi

log "🚀 Iniciando deploy do CDN Proxy Frontend..."

# Verificar arquivos necessários
log "📋 Verificando arquivos necessários..."

required_files=(
    "proxy-server.js"
    "package.json"
    "Dockerfile.proxy"
    ".env.production"
    "analytics-client.js"
    "backend/utils/geolocation.cjs"
    "$COMPOSE_FILE"
)

for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        error "Arquivo necessário não encontrado: $file"
        exit 1
    fi
done

success "Todos os arquivos necessários encontrados!"

# Parar container existente se estiver rodando
log "🛑 Parando container existente (se houver)..."
if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
    docker-compose -f $COMPOSE_FILE down
    success "Container anterior parado"
else
    log "Nenhum container anterior encontrado"
fi

# Remover imagem antiga (opcional)
if [[ "$1" == "--rebuild" ]]; then
    log "🗑️ Removendo imagem anterior..."
    docker rmi $IMAGE_NAME 2>/dev/null || true
fi

# Construir nova imagem
log "🔨 Construindo nova imagem Docker..."
docker-compose -f $COMPOSE_FILE build --no-cache

success "Imagem construída com sucesso!"

# Iniciar novo container
log "🚀 Iniciando novo container..."
docker-compose -f $COMPOSE_FILE up -d

# Aguardar container inicializar
log "⏳ Aguardando container inicializar..."
sleep 10

# Verificar se container está rodando
if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
    success "Container está rodando!"
else
    error "Falha ao iniciar container!"
    log "Logs do container:"
    docker logs $CONTAINER_NAME
    exit 1
fi

# Verificar health check
log "🏥 Verificando health check..."
for i in {1..30}; do
    if curl -f http://localhost:8080/health &>/dev/null; then
        success "Health check passou!"
        break
    fi
    
    if [[ $i -eq 30 ]]; then
        error "Health check falhou após 30 tentativas!"
        log "Logs do container:"
        docker logs --tail 50 $CONTAINER_NAME
        exit 1
    fi
    
    log "Tentativa $i/30 - aguardando health check..."
    sleep 2
done

# Testar APIs backend
log "🌐 Testando conectividade com APIs backend..."

# Teste API primária
if curl -f https://api.cdnproxy.top/api/test-geolocation?ip=8.8.8.8 &>/dev/null; then
    success "API primária (api.cdnproxy.top) está respondendo"
else
    warning "API primária (api.cdnproxy.top) não está respondendo"
fi

# Teste API secundária
if curl -f https://gf.proxysrv.top/api/test-geolocation?ip=8.8.8.8 &>/dev/null; then
    success "API secundária (gf.proxysrv.top) está respondendo"
else
    warning "API secundária (gf.proxysrv.top) não está respondendo"
fi

# Testar geolocalização local
log "🌍 Testando geolocalização local..."
if curl -X POST http://localhost:8080/api/test-geolocation \
    -H "Content-Type: application/json" \
    -d '{"ip":"8.8.8.8"}' &>/dev/null; then
    success "Geolocalização local funcionando"
else
    warning "Geolocalização local com problemas"
fi

# Mostrar status final
log "📊 Status final do deploy:"
echo ""
echo "Container: $(docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' -f name=$CONTAINER_NAME)"
echo ""

# Mostrar logs recentes
log "📝 Logs recentes:"
docker logs --tail 20 $CONTAINER_NAME

echo ""
success "🎉 Deploy concluído com sucesso!"
echo ""
log "📋 Próximos passos:"
echo "  1. Configurar Nginx (se necessário)"
echo "  2. Configurar DNS para apontar para este servidor"
echo "  3. Testar com domínios personalizados"
echo "  4. Configurar monitoramento"
echo ""
log "🔧 Comandos úteis:"
echo "  - Ver logs: docker logs -f $CONTAINER_NAME"
echo "  - Reiniciar: docker-compose -f $COMPOSE_FILE restart"
echo "  - Parar: docker-compose -f $COMPOSE_FILE down"
echo "  - Health check: curl http://localhost:8080/health"
echo "  - Stats geo: curl http://localhost:8080/geo-stats"
echo ""

# Verificar se há atualizações pendentes
if [[ -f ".git/HEAD" ]]; then
    log "📦 Verificando atualizações..."
    git fetch &>/dev/null || true
    if [[ $(git rev-list HEAD...origin/main --count 2>/dev/null || echo "0") -gt 0 ]]; then
        warning "Há atualizações disponíveis no repositório!"
    fi
fi

log "✅ Deploy finalizado!"