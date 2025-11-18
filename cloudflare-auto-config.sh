#!/bin/bash

source ./cloudflare-simple-config.sh

# Configuração automática Cloudflare via API
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo "❌ Variáveis de ambiente não configuradas"
    exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4"
HEADERS="Authorization: Bearer $CLOUDFLARE_API_TOKEN"

echo "🔧 Configurando regras de cache..."

# Configurar cache para arquivos estáticos
curl -X POST "$API_BASE/zones/$CLOUDFLARE_ZONE_ID/pagerules" \
  -H "$HEADERS" \
  -H "Content-Type: application/json" \
  --data '{
    "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "*example.com/*.{css,js,jpg,jpeg,png,gif,ico,svg,woff,woff2,ttf,eot}"}}],
    "actions": [
      {"id": "cache_level", "value": "cache_everything"},
      {"id": "edge_cache_ttl", "value": 2592000},
      {"id": "browser_cache_ttl", "value": 2592000}
    ],
    "priority": 1,
    "status": "active"
  }'

echo "🛡️ Configurando regras de segurança..."

# Rate limiting para API
curl -X POST "$API_BASE/zones/$CLOUDFLARE_ZONE_ID/rate_limits" \
  -H "$HEADERS" \
  -H "Content-Type: application/json" \
  --data '{
    "match": {
      "request": {
        "url": "*example.com/api/*"
      }
    },
    "threshold": 100,
    "period": 60,
    "action": {
      "mode": "challenge",
      "timeout": 86400
    }
  }'

echo "✅ Configuração Cloudflare concluída"
