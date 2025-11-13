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
