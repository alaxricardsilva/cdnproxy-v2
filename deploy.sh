#!/bin/bash

# Script de Deploy com PM2

# Caminho do projeto
PROJECT_DIR="/www/wwwroot/CDNProxy_v2"

# Iniciar o frontend
cd "$PROJECT_DIR/frontend"
pm install
pm run build
pm start
pm2 start npm --name "frontend" -- run start

# Iniciar o backend
cd "$PROJECT_DIR/backend"
pm install
pm start
pm2 start npm --name "backend" -- run start

# Iniciar o proxy-server.js
cd "$PROJECT_DIR"
pm install
pm2 start proxy-server.js --name "proxy-server" --watch

# Exibir status do PM2
pm2 status

# Mensagem de conclusão
echo "Deploy concluído com sucesso!"