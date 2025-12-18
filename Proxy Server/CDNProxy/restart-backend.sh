#!/bin/bash

echo "Parando os serviços..."
cd /www/wwwroot/CDNProxy
docker-compose -f docker-compose.server2.yml down

echo "Reconstruindo e iniciando os serviços..."
docker-compose -f docker-compose.server2.yml up -d --build

echo "Verificando o status dos serviços..."
docker-compose -f docker-compose.server2.yml ps

echo "Aguardando inicialização..."
sleep 10

echo "Verificando health check..."
curl -f http://localhost:5001/api/health || echo "Health check falhou"

echo "Reinicialização concluída!"#!/bin/bash

echo "Parando os serviços..."
cd /www/wwwroot/CDNProxy
docker-compose -f docker-compose.server2.yml down

echo "Reconstruindo e iniciando os serviços..."
docker-compose -f docker-compose.server2.yml up -d --build

echo "Verificando o status dos serviços..."
docker-compose -f docker-compose.server2.yml ps

echo "Aguardando inicialização..."
sleep 10

echo "Verificando health check..."
curl -f http://localhost:5001/api/health || echo "Health check falhou"

echo "Reinicialização concluída!"