#!/bin/bash

echo "☁️ Configuração Simplificada do Cloudflare para cdnproxy.top"

# Credenciais
API_TOKEN="x5dxX0QwcJ3E8g0TPnypLChyf-MeXhUcLBUTUOj1"
ZONE_ID="27a27ddf0dce63e2942c2206799cc479"
API_BASE="https://api.cloudflare.com/client/v4"

# Função para fazer requisições à API
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$API_BASE$endpoint" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "$data"
    else
        curl -s -X "$method" "$API_BASE$endpoint" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json"
    fi
}

# Verificar zona
echo "🔍 Verificando zona cdnproxy.top..."
zone_response=$(api_request "GET" "/zones/$ZONE_ID")

if echo "$zone_response" | grep -q '"success":true'; then
    zone_name=$(echo "$zone_response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Zona encontrada: $zone_name"
    
    # Verificar plano
    plan_name=$(echo "$zone_response" | grep -o '"name":"[^"]*Website[^"]*"' | cut -d'"' -f4)
    echo "📋 Plano: $plan_name"
else
    echo "❌ Erro ao acessar zona"
    exit 1
fi

# Configurar SSL/TLS para modo flexível
echo "🔒 Configurando SSL/TLS..."
ssl_response=$(api_request "PATCH" "/zones/$ZONE_ID/settings/ssl" '{"value": "flexible"}')

if echo "$ssl_response" | grep -q '"success":true'; then
    echo "✅ SSL configurado para modo flexível"
else
    echo "⚠️ Aviso SSL: $(echo "$ssl_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Ativar Always Use HTTPS
echo "🔐 Ativando Always Use HTTPS..."
https_response=$(api_request "PATCH" "/zones/$ZONE_ID/settings/always_use_https" '{"value": "on"}')

if echo "$https_response" | grep -q '"success":true'; then
    echo "✅ Always Use HTTPS ativado"
else
    echo "⚠️ Aviso HTTPS: $(echo "$https_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Ativar minificação
echo "⚡ Ativando minificação..."
minify_response=$(api_request "PATCH" "/zones/$ZONE_ID/settings/minify" '{"value": {"css": "on", "html": "on", "js": "on"}}')

if echo "$minify_response" | grep -q '"success":true'; then
    echo "✅ Minificação CSS/HTML/JS ativada"
else
    echo "⚠️ Aviso minificação: $(echo "$minify_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Ativar Brotli
echo "📦 Ativando compressão Brotli..."
brotli_response=$(api_request "PATCH" "/zones/$ZONE_ID/settings/brotli" '{"value": "on"}')

if echo "$brotli_response" | grep -q '"success":true'; then
    echo "✅ Compressão Brotli ativada"
else
    echo "⚠️ Aviso Brotli: $(echo "$brotli_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Configurar cache level
echo "🗂️ Configurando nível de cache..."
cache_response=$(api_request "PATCH" "/zones/$ZONE_ID/settings/cache_level" '{"value": "aggressive"}')

if echo "$cache_response" | grep -q '"success":true'; then
    echo "✅ Cache agressivo ativado"
else
    echo "⚠️ Aviso cache: $(echo "$cache_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Ativar Browser Cache TTL
echo "⏰ Configurando Browser Cache TTL..."
browser_cache_response=$(api_request "PATCH" "/zones/$ZONE_ID/settings/browser_cache_ttl" '{"value": 31536000}')

if echo "$browser_cache_response" | grep -q '"success":true'; then
    echo "✅ Browser Cache TTL configurado para 1 ano"
else
    echo "⚠️ Aviso Browser Cache: $(echo "$browser_cache_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

# Purgar cache
echo "🧹 Limpando cache..."
purge_response=$(api_request "POST" "/zones/$ZONE_ID/purge_cache" '{"purge_everything": true}')

if echo "$purge_response" | grep -q '"success":true'; then
    echo "✅ Cache limpo com sucesso"
else
    echo "⚠️ Aviso purge: $(echo "$purge_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)"
fi

echo ""
echo "✅ Configuração Cloudflare concluída!"
echo "📊 Resumo das configurações aplicadas:"
echo "   ✓ SSL modo flexível"
echo "   ✓ Always Use HTTPS"
echo "   ✓ Minificação CSS/HTML/JS"
echo "   ✓ Compressão Brotli"
echo "   ✓ Cache agressivo"
echo "   ✓ Browser Cache TTL (1 ano)"
echo "   ✓ Cache limpo"
echo ""
echo "🌐 Sua zona cdnproxy.top está otimizada para CDN!"