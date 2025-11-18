#!/bin/bash

# =============================================================================
# Cloudflare CDN Setup Script - CORRIGIDO
# Configuração e integração com Cloudflare para CDN Proxy
# =============================================================================

echo "☁️ Configurando integração com Cloudflare CDN..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date '+%d-%m-%Y %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configurar variáveis se não estiverem definidas
if [ -z "$API_TOKEN" ]; then
    export API_TOKEN='x5dxX0QwcJ3E8g0TPnypLChyf-MeXhUcLBUTUOj1'
    log "API_TOKEN configurado"
fi

if [ -z "$ZONE_ID" ]; then
    export ZONE_ID='27a27ddf0dce63e2942c2206799cc479'
    log "ZONE_ID configurado"
fi

# Salvar variáveis no .bashrc para persistência
echo "export API_TOKEN='$API_TOKEN'" >> ~/.bashrc
echo "export ZONE_ID='$ZONE_ID'" >> ~/.bashrc

log "Variáveis Cloudflare configuradas e salvas"

# Função para configurar nginx no aaPanel automaticamente
configure_aapanel_nginx() {
    log "Configurando nginx no aaPanel..."
    
    # Diretórios comuns do aaPanel
    AAPANEL_NGINX_DIRS=(
        "/www/server/nginx/conf"
        "/www/server/panel/vhost/nginx"
        "/etc/nginx/conf.d"
        "/usr/local/nginx/conf"
    )
    
    # Procurar diretório do aaPanel
    NGINX_DIR=""
    for dir in "${AAPANEL_NGINX_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            NGINX_DIR="$dir"
            log "Diretório nginx encontrado: $NGINX_DIR"
            break
        fi
    done
    
    if [ -z "$NGINX_DIR" ]; then
        warn "Diretório nginx do aaPanel não encontrado. Configuração manual necessária."
        return 1
    fi
    
    # Copiar cloudflare-headers.conf para o nginx
    if [ -f "/www/wwwroot/CDNProxy/cloudflare-headers.conf" ]; then
        cp /www/wwwroot/CDNProxy/cloudflare-headers.conf "$NGINX_DIR/"
        log "cloudflare-headers.conf copiado para $NGINX_DIR/"
    fi
    
    # Procurar arquivos de configuração do site
    SITE_CONFIGS=(
        "$NGINX_DIR/*.conf"
        "/www/server/panel/vhost/nginx/*.conf"
    )
    
    for pattern in "${SITE_CONFIGS[@]}"; do
        for config_file in $pattern; do
            if [ -f "$config_file" ] && grep -q "server_name.*cdnproxy\|server_name.*localhost" "$config_file" 2>/dev/null; then
                log "Configurando $config_file..."
                
                # Backup do arquivo original
                cp "$config_file" "$config_file.backup.$(date +%Y%m%d_%H%M%S)"
                
                # Adicionar include do cloudflare-headers.conf se não existir
                if ! grep -q "cloudflare-headers.conf" "$config_file"; then
                    # Adicionar após a linha server {
                    sed -i '/server[[:space:]]*{/a\    include cloudflare-headers.conf;' "$config_file"
                    log "Include cloudflare-headers.conf adicionado em $config_file"
                fi
                
                # Adicionar configurações específicas do Cloudflare
                if ! grep -q "real_ip_from" "$config_file"; then
                    cat >> "$config_file" << 'NGINX_CF_EOF'

    # Cloudflare Real IP Configuration
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;
NGINX_CF_EOF
                    log "Configurações Real IP do Cloudflare adicionadas"
                fi
            fi
        done
    done
    
    # Testar configuração nginx
    if command -v nginx >/dev/null 2>&1; then
        if nginx -t 2>/dev/null; then
            log "Configuração nginx válida"
            # Recarregar nginx
            systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || /etc/init.d/nginx reload 2>/dev/null
            log "Nginx recarregado com sucesso"
        else
            error "Erro na configuração nginx. Restaurando backup..."
            # Restaurar backups se houver erro
            for pattern in "${SITE_CONFIGS[@]}"; do
                for config_file in $pattern; do
                    if [ -f "$config_file.backup.$(date +%Y%m%d_%H%M%S)" ]; then
                        mv "$config_file.backup.$(date +%Y%m%d_%H%M%S)" "$config_file"
                    fi
                done
            done
        fi
    fi
}

# Executar configuração do nginx
configure_aapanel_nginx

# 1. Criar configuração Cloudflare
log "Criando configuração Cloudflare..."
cat > /www/wwwroot/CDNProxy/cloudflare-config.json << 'EOF'
{
  "cache_rules": {
    "static_files": {
      "pattern": "*.{css,js,jpg,jpeg,png,gif,ico,svg,woff,woff2,ttf,eot}",
      "cache_level": "cache_everything",
      "edge_cache_ttl": 2592000,
      "browser_cache_ttl": 2592000
    },
    "api_routes": {
      "pattern": "/api/*",
      "cache_level": "bypass",
      "edge_cache_ttl": 0,
      "browser_cache_ttl": 0
    },
    "auth_routes": {
      "pattern": "/auth/*",
      "cache_level": "bypass",
      "edge_cache_ttl": 0,
      "browser_cache_ttl": 0
    },
    "admin_routes": {
      "pattern": "/admin/*",
      "cache_level": "bypass",
      "edge_cache_ttl": 0,
      "browser_cache_ttl": 0
    },
    "proxy_routes": {
      "pattern": "/proxy/*",
      "cache_level": "standard",
      "edge_cache_ttl": 300,
      "browser_cache_ttl": 300
    }
  },
  "security_rules": {
    "rate_limiting": {
      "api_endpoints": {
        "threshold": 100,
        "period": 60,
        "action": "challenge"
      },
      "login_endpoints": {
        "threshold": 10,
        "period": 300,
        "action": "block"
      }
    },
    "firewall_rules": [
      {
        "expression": "(http.request.uri.path contains \"/admin\" and cf.threat_score > 10)",
        "action": "challenge"
      },
      {
        "expression": "(http.request.method eq \"POST\" and cf.threat_score > 20)",
        "action": "challenge"
      }
    ]
  },
  "performance": {
    "minify": {
      "css": true,
      "js": true,
      "html": true
    },
    "compression": "gzip",
    "http2": true,
    "http3": true,
    "early_hints": true
  }
}
EOF

# 2. Criar script de configuração automática
log "Criando script de configuração automática..."
cat > /www/wwwroot/CDNProxy/cloudflare-auto-config.sh << 'EOF'
#!/bin/bash

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
EOF

chmod +x /www/wwwroot/CDNProxy/cloudflare-auto-config.sh

# 3. Criar script de purge de cache
log "Criando script de purge de cache..."
cat > /www/wwwroot/CDNProxy/cloudflare-purge.sh << 'EOF'
#!/bin/bash

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
EOF

chmod +x /www/wwwroot/CDNProxy/cloudflare-purge.sh

# 4. Criar configuração de headers para Cloudflare
log "Criando configuração de headers para Cloudflare..."
cat > /www/wwwroot/CDNProxy/cloudflare-headers.conf << 'EOF'
# Headers específicos para Cloudflare
add_header CF-Cache-Status $http_cf_cache_status;
add_header CF-Ray $http_cf_ray;
add_header CF-Visitor $http_cf_visitor;

# Headers para otimização
add_header Vary "Accept-Encoding, CloudFront-Viewer-Country";
add_header Cache-Control "public, max-age=31536000" always;

# Headers de segurança compatíveis com Cloudflare
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
EOF

# 5. Criar script de monitoramento Cloudflare
log "Criando script de monitoramento Cloudflare..."
cat > /www/wwwroot/CDNProxy/cloudflare-monitor.sh << 'EOF'
#!/bin/bash

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
EOF

chmod +x /www/wwwroot/CDNProxy/cloudflare-monitor.sh

# 6. Criar documentação
log "Criando documentação Cloudflare..."
cat > /www/wwwroot/CDNProxy/CLOUDFLARE_SETUP.md << 'EOF'
# 🌐 Configuração Cloudflare CDN

## 📋 Pré-requisitos

1. Conta Cloudflare ativa
2. Domínio configurado no Cloudflare
3. API Token com permissões de Zone:Edit

## 🔧 Configuração Inicial

### 1. Configurar Variáveis de Ambiente
```bash
export API_TOKEN="x5dxX0QwcJ3E8g0TPnypLChyf-MeXhUcLBUTUOj1"
export ZONE_ID="27a27ddf0dce63e2942c2206799cc479"
```

### 2. Executar Configuração Automática
```bash
./cloudflare-auto-config.sh
```

### 3. Aplicar Headers Nginx
```bash
# Incluir no nginx.conf
include /www/wwwroot/CDNProxy/cloudflare-headers.conf;
```

## 🛠️ Scripts Disponíveis

- `cloudflare-auto-config.sh` - Configuração automática via API
- `cloudflare-purge.sh` - Limpeza de cache
- `cloudflare-monitor.sh` - Monitoramento de performance

## 📊 Monitoramento

Execute diariamente:
```bash
./cloudflare-monitor.sh
```

## 🧹 Limpeza de Cache

```bash
# Limpar todo o cache
./cloudflare-purge.sh all

# Limpar apenas estáticos
./cloudflare-purge.sh static
```

## ⚙️ Configurações Recomendadas

### Cache Rules
- **Arquivos Estáticos**: Cache Everything (30 dias)
- **API Routes**: Bypass Cache
- **Auth Routes**: Bypass Cache
- **Proxy Routes**: Standard Cache (5 min)

### Security Rules
- **Rate Limiting**: 100 req/min para API
- **Firewall**: Challenge para admin com threat score > 10
- **Bot Fight Mode**: Ativado

### Performance
- **Minification**: CSS, JS, HTML
- **Compression**: Gzip/Brotli
- **HTTP/2**: Ativado
- **HTTP/3**: Ativado
- **Early Hints**: Ativado
EOF

echo ""
echo "☁️ Configuração Cloudflare Criada!"
echo "📋 Próximos passos:"
echo "   1. Configure as variáveis de ambiente"
echo "   2. Execute: ./cloudflare-auto-config.sh"
echo "   3. Inclua cloudflare-headers.conf no Nginx"
echo "   4. Teste com: ./cloudflare-monitor.sh"
echo ""