#!/bin/bash

# Script de instalação para Servidor 2 (Backend + Redis + Nginx)
# CDN Proxy - Sistema de Streaming IPTV

set -e

echo "🚀 Iniciando instalação do Servidor 2 (Backend + Redis + Nginx)..."

# Verificar e instalar Node.js 20.19.x (necessário para o projeto)
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instalando Node.js 20.19.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "⚠️  Versão do Node.js ($NODE_VERSION) é antiga. Atualizando para 20.19.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo "✅ Node.js $(node -v) já instalado"
    fi
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instalando..."
    sudo apt-get install -y npm
fi

echo "📦 Node.js: $(node -v)"
echo "📦 npm: $(npm -v)"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instalando..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Criar diretório SSL se não existir
if [ ! -d "./ssl" ]; then
    echo "📁 Criando diretório SSL..."
    mkdir -p ./ssl
    echo "⚠️  ATENÇÃO: Coloque os certificados SSL em ./ssl/"
    echo "   - api.cdnproxy.top.crt"
    echo "   - api.cdnproxy.top.key"
fi

# Verificar se arquivo .env.production existe
if [ ! -f "./backend/.env.production" ]; then
    echo "❌ Arquivo .env.production não encontrado no backend!"
    echo "   Copie o arquivo .env.production.example e configure as variáveis"
    exit 1
fi

# Configurar Nginx no aaPanel (se disponível)
if [ -d "/www/server/panel/vhost/nginx" ]; then
    echo "🔧 Configurando Nginx no aaPanel..."
    
    # Criar backup da configuração existente se houver
    if [ -f "/www/server/panel/vhost/nginx/api.cdnproxy.top.conf" ]; then
        echo "📋 Fazendo backup da configuração existente..."
        sudo cp /www/server/panel/vhost/nginx/api.cdnproxy.top.conf /www/server/panel/vhost/nginx/api.cdnproxy.top.conf.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Copiar configuração do Nginx
    echo "📁 Copiando configuração do Nginx para aaPanel..."
    sudo cp ./nginx.server2.conf /www/server/panel/vhost/nginx/api.cdnproxy.top.conf
    
    # Criar diretório de certificados se não existir
    sudo mkdir -p /www/server/panel/vhost/cert/api.cdnproxy.top
    
    # Verificar se certificados SSL existem e copiar
    if [ -f "./ssl/api.cdnproxy.top.crt" ] && [ -f "./ssl/api.cdnproxy.top.key" ]; then
        echo "🔐 Copiando certificados SSL..."
        sudo cp ./ssl/api.cdnproxy.top.crt /www/server/panel/vhost/cert/api.cdnproxy.top/fullchain.pem
        sudo cp ./ssl/api.cdnproxy.top.key /www/server/panel/vhost/cert/api.cdnproxy.top/privkey.pem
        sudo chmod 600 /www/server/panel/vhost/cert/api.cdnproxy.top/privkey.pem
        sudo chmod 644 /www/server/panel/vhost/cert/api.cdnproxy.top/fullchain.pem
    else
        echo "⚠️  Certificados SSL não encontrados em ./ssl/"
        echo "   Configure os certificados manualmente no aaPanel"
    fi
    
    # Testar configuração do Nginx
    if command -v nginx &> /dev/null; then
        echo "🔍 Testando configuração do Nginx..."
        sudo nginx -t
        if [ $? -eq 0 ]; then
            echo "✅ Configuração do Nginx válida"
            echo "🔄 Recarregando Nginx..."
            sudo nginx -s reload
        else
            echo "❌ Erro na configuração do Nginx"
        fi
    fi
    
    echo "✅ Configuração do aaPanel concluída"
else
    echo "⚠️  aaPanel não detectado - usando configuração Docker padrão"
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose -f docker-compose.server2.yml down --remove-orphans || true

# Construir e iniciar containers
echo "🔨 Construindo e iniciando containers..."
docker-compose -f docker-compose.server2.yml up --build -d

# Aguardar containers ficarem prontos
echo "⏳ Aguardando containers ficarem prontos..."
sleep 30

# Verificar status dos containers
echo "📊 Verificando status dos containers..."
docker-compose -f docker-compose.server2.yml ps

# Verificar logs
echo "📋 Últimos logs do backend:"
docker-compose -f docker-compose.server2.yml logs --tail=20 backend

echo "📋 Últimos logs do redis:"
docker-compose -f docker-compose.server2.yml logs --tail=20 redis

echo "📋 Últimos logs do nginx:"
docker-compose -f docker-compose.server2.yml logs --tail=20 nginx

# Teste de conectividade
echo "🔍 Testando conectividade..."
if curl -f -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend respondendo na porta 5001"
else
    echo "❌ Backend não está respondendo na porta 5001"
fi

if curl -f -s http://localhost:80 > /dev/null; then
    echo "✅ Nginx respondendo na porta 80"
else
    echo "❌ Nginx não está respondendo na porta 80"
fi

# Testar Redis
if docker-compose -f docker-compose.server2.yml exec -T redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis funcionando corretamente"
else
    echo "❌ Redis não está funcionando"
fi

echo ""
echo "🎉 Instalação do Servidor 2 concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Configure os certificados SSL em ./ssl/"
echo "   2. Verifique se o domínio api.cdnproxy.top aponta para este servidor"
echo "   3. Configure o banco de dados Supabase"
echo "   4. Teste o acesso via https://api.cdnproxy.top"
echo ""
echo "🔧 Comandos úteis:"
echo "   - Ver logs: docker-compose -f docker-compose.server2.yml logs -f"
echo "   - Parar: docker-compose -f docker-compose.server2.yml down"
echo "   - Reiniciar: docker-compose -f docker-compose.server2.yml restart"
echo "   - Acessar Redis: docker-compose -f docker-compose.server2.yml exec redis redis-cli"
echo ""