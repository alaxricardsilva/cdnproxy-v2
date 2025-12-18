#!/bin/bash

# Script para build e push das imagens Docker para o Docker Hub
# CDNProxy - Backend + Redis

set -e

# Configurações
DOCKER_USERNAME="alaxricard"
BACKEND_IMAGE="${DOCKER_USERNAME}/cdnproxy-backend"
REDIS_IMAGE="${DOCKER_USERNAME}/cdnproxy-redis"
VERSION_TAG="latest"
DATE_TAG=$(date +%Y%m%d)

echo "🐋 CDNProxy - Build e Push para Docker Hub"
echo "============================================"
echo ""
echo "📦 Username: ${DOCKER_USERNAME}"
echo "🏷️  Version: ${VERSION_TAG}"
echo "📅 Date Tag: ${DATE_TAG}"
echo ""

# Verificar se está logado no Docker Hub
echo "🔐 Verificando autenticação Docker Hub..."
if ! docker info | grep -q "Username: ${DOCKER_USERNAME}"; then
    echo "❌ Você não está logado no Docker Hub!"
    echo "Execute: docker login"
    echo "Username: ${DOCKER_USERNAME}"
    exit 1
fi

echo "✅ Autenticação verificada!"
echo ""

# Build e Push Backend
echo "🔨 1. BACKEND - Construindo imagem..."
echo "======================================"
DOCKER_BUILDKIT=0 docker build \
    -t ${BACKEND_IMAGE}:${VERSION_TAG} \
    -t ${BACKEND_IMAGE}:${DATE_TAG} \
    -t ${BACKEND_IMAGE}:v2.0.1 \
    ./backend

if [ $? -eq 0 ]; then
    echo "✅ Backend - Build concluído!"
    echo ""
    
    echo "📤 Enviando Backend para Docker Hub..."
    docker push ${BACKEND_IMAGE}:${VERSION_TAG}
    docker push ${BACKEND_IMAGE}:${DATE_TAG}
    docker push ${BACKEND_IMAGE}:v2.0.1
    
    if [ $? -eq 0 ]; then
        echo "✅ Backend - Push concluído!"
    else
        echo "❌ Erro ao fazer push do Backend"
        exit 1
    fi
else
    echo "❌ Erro ao construir Backend"
    exit 1
fi

echo ""

# Build e Push Redis
echo "🔨 2. REDIS - Construindo imagem..."
echo "===================================="
DOCKER_BUILDKIT=0 docker build \
    -t ${REDIS_IMAGE}:${VERSION_TAG} \
    -t ${REDIS_IMAGE}:${DATE_TAG} \
    -t ${REDIS_IMAGE}:7.4.6 \
    ./redis

if [ $? -eq 0 ]; then
    echo "✅ Redis - Build concluído!"
    echo ""
    
    echo "📤 Enviando Redis para Docker Hub..."
    docker push ${REDIS_IMAGE}:${VERSION_TAG}
    docker push ${REDIS_IMAGE}:${DATE_TAG}
    docker push ${REDIS_IMAGE}:7.4.6
    
    if [ $? -eq 0 ]; then
        echo "✅ Redis - Push concluído!"
    else
        echo "❌ Erro ao fazer push do Redis"
        exit 1
    fi
else
    echo "❌ Erro ao construir Redis"
    exit 1
fi

echo ""
echo "🎉 BUILD E PUSH CONCLUÍDOS COM SUCESSO!"
echo "========================================"
echo ""
echo "📋 Imagens publicadas:"
echo "  - ${BACKEND_IMAGE}:${VERSION_TAG}"
echo "  - ${BACKEND_IMAGE}:${DATE_TAG}"
echo "  - ${BACKEND_IMAGE}:v1.2.3"
echo "  - ${REDIS_IMAGE}:${VERSION_TAG}"
echo "  - ${REDIS_IMAGE}:${DATE_TAG}"
echo "  - ${REDIS_IMAGE}:7.4.6"
echo ""
echo "🔗 Visualizar no Docker Hub:"
echo "  - https://hub.docker.com/r/${DOCKER_USERNAME}/cdnproxy-backend"
echo "  - https://hub.docker.com/r/${DOCKER_USERNAME}/cdnproxy-redis"
echo ""
echo "✅ Pronto para deploy!"
