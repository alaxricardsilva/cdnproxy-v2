#!/bin/bash

source ./cloudflare-simple-config.sh

# Purge de cache Cloudflare
if [ -z "$API_TOKEN" ] || [ -z "$ZONE_ID" ]; then
    echo "❌ Variáveis de ambiente não configuradas"
    exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4"
HEADERS="Authorization: Bearer $API_TOKEN"

case "$1" in
    "all")
        echo "🧹 Limpando todo o cache..."
        curl -X POST "$API_BASE/zones/$ZONE_ID/purge_cache" \
          -H "$HEADERS" \
          -H "Content-Type: application/json" \
          --data '{"purge_everything":true}'
        ;;
    "static")
        echo "🧹 Limpando cache de arquivos estáticos..."
        curl -X POST "$API_BASE/zones/$ZONE_ID/purge_cache" \
          -H "$HEADERS" \
          -H "Content-Type: application/json" \
          --data '{"files":["*.css","*.js","*.png","*.jpg","*.gif","*.ico"]}'
        ;;
    *)
        echo "Uso: $0 {all|static}"
        echo "  all    - Limpa todo o cache"
        echo "  static - Limpa apenas arquivos estáticos"
        exit 1
        ;;
esac

echo "✅ Purge concluído"
