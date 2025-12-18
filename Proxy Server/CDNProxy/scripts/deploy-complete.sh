#!/bin/bash

# Script para deploy completo do backend CDNProxy
# Remove containers, volumes, sistema e faz rebuild completo

set -e

echo "🚀 Iniciando deploy completo do CDNProxy Backend"

# 1. Parar e remover containers existentes
echo "🛑 Parando e removendo containers..."
cd /www/wwwroot/CDNProxy
docker-compose -f docker-compose.server2.yml down --volumes --remove-orphans

# 2. Remover imagens antigas
echo "🧹 Removendo imagens antigas..."
docker rmi cdnproxy-backend cdnproxy-redis 2>/dev/null || true

# 3. Limpar cache do Docker
echo "🧼 Limpando cache do Docker..."
docker builder prune -f

# 4. Reconstruir do zero
echo "🏗️  Reconstruindo imagens..."
docker-compose -f docker-compose.server2.yml build --no-cache

# 5. Iniciar containers
echo "▶️  Iniciando containers..."
docker-compose -f docker-compose.server2.yml up -d

# 6. Aguardar containers ficarem saudáveis
echo "⏱️  Aguardando containers ficarem saudáveis..."
sleep 10

# 7. Verificar status
echo "📊 Verificando status dos containers..."
docker-compose -f docker-compose.server2.yml ps

# 8. Testar health check
echo "🩺 Testando health check..."
curl -s https://api.cdnproxy.top/api/health | jq .

echo "✅ Deploy completo concluído com sucesso!"