#!/bin/bash

source ./cloudflare-simple-config.sh

# Monitor de performance Cloudflare
echo "📊 Status Cloudflare - $(date)"

if [ -z "$API_TOKEN" ] || [ -z "$ZONE_ID" ]; then
    echo "❌ Variáveis de ambiente não configuradas"
    exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4"
HEADERS="Authorization: Bearer $API_TOKEN"

# Analytics básico
echo "📈 Analytics das últimas 24h:"
curl -s "$API_BASE/zones/$ZONE_ID/analytics/dashboard?since=-1440" \
  -H "$HEADERS" | jq -r '.result.totals | "Requests: \(.requests.all) | Bandwidth: \(.bandwidth.all) | Threats: \(.threats.all)"'

# Cache ratio
echo "💾 Cache Ratio:"
curl -s "$API_BASE/zones/$ZONE_ID/analytics/dashboard?since=-1440" \
  -H "$HEADERS" | jq -r '.result.totals | "Cached: \(.requests.cached) | Uncached: \(.requests.uncached)"'

# Status da zona
echo "🌐 Status da Zona:"
curl -s "$API_BASE/zones/$ZONE_ID" \
  -H "$HEADERS" | jq -r '.result | "Status: \(.status) | Plan: \(.plan.name)"'

echo "✅ Monitoramento concluído"
