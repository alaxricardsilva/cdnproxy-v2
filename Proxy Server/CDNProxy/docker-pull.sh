#!/bin/bash

# Script para pull das imagens Docker do Docker Hub
# CDNProxy - Backend + Redis

set -e

# Configurações
DOCKER_USERNAME="alaxricard"
BACKEND_IMAGE="${DOCKER_USERNAME}/cdnproxy-backend:latest"
REDIS_IMAGE="${DOCKER_USERNAME}/cdnproxy-redis:latest"

echo "🐋 CDNProxy - Pull das imagens do Docker Hub"
echo "=============================================="
echo ""

# Pull Backend
echo "📥 1. Baixando Backend..."
docker pull ${BACKEND_IMAGE}

if [ $? -eq 0 ]; then
    echo "✅ Backend - Download concluído!"
else
    echo "❌ Erro ao baixar Backend"
    exit 1
fi

echo ""

# Pull Redis
echo "📥 2. Baixando Redis..."
docker pull ${REDIS_IMAGE}

if [ $? -eq 0 ]; then
    echo "✅ Redis - Download concluído!"
else
    echo "❌ Erro ao baixar Redis"
    exit 1
fi

echo ""
echo "🎉 DOWNLOAD CONCLUÍDO COM SUCESSO!"
echo "===================================="
echo ""
echo "📋 Imagens baixadas:"
echo "  - ${BACKEND_IMAGE}"
echo "  - ${REDIS_IMAGE}"
echo ""
echo "🚀 Para iniciar os containers:"
echo "  docker-compose -f docker-compose.server2.yml up -d"
echo ""
