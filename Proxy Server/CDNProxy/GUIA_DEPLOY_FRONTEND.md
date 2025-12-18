# Guia de Deploy - Servidor Frontend Separado

## 📋 Visão Geral

Este guia detalha como configurar o servidor frontend (proxy) em um servidor separado do backend, com múltiplas APIs para redundância.

## 🗂️ Arquivos Necessários para o Servidor Frontend

### Arquivos Obrigatórios

```
CDNProxy-Frontend/
├── proxy-server.js              # Servidor proxy principal (MODIFICADO)
├── package.json                 # Dependências do Node.js
├── package-lock.json           # Lock das dependências
├── Dockerfile.proxy            # Container Docker para o proxy
├── .env.production             # Variáveis de ambiente
├── analytics-client.js         # Cliente de analytics
├── backend/
│   └── utils/
│       └── geolocation.cjs     # Utilitários de geolocalização
└── public/                     # Arquivos estáticos (opcional)
    ├── favicon.ico
    └── sw.js
```

### Arquivos de Configuração

```
nginx/
├── nginx.conf                  # Configuração do Nginx
└── ssl/                       # Certificados SSL (se necessário)
```

## 🔧 Configuração do Ambiente

### 1. Variáveis de Ambiente (.env.production)

```bash
# Configuração do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jyconxalcfqvqakrswnb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY

# Configuração do Servidor
PORT=8080
NODE_ENV=production

# APIs Backend (múltiplas para redundância)
BACKEND_API_PRIMARY=https://api.cdnproxy.top
BACKEND_API_SECONDARY=https://gf.proxysrv.top
```

### 2. Dependências (package.json)

```json
{
  "name": "cdnproxy-frontend",
  "version": "1.0.0",
  "description": "CDN Proxy Frontend Server",
  "main": "proxy-server.js",
  "scripts": {
    "start": "node proxy-server.js",
    "dev": "nodemon proxy-server.js",
    "docker:build": "docker build -f Dockerfile.proxy -t cdnproxy-frontend .",
    "docker:run": "docker run -p 8080:8080 --env-file .env.production cdnproxy-frontend"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "geoip-lite": "^1.4.10",
    "node-fetch": "^2.7.0",
    "ua-parser-js": "^1.0.37"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

## 🐳 Deploy com Docker

### 1. Dockerfile.proxy (já configurado)

O arquivo `Dockerfile.proxy` já está otimizado para produção com:
- Node.js 20 Alpine (imagem leve)
- Usuário não-root para segurança
- Health check configurado
- Cache de dependências otimizado

### 2. Comandos de Deploy

```bash
# 1. Copiar arquivos para o servidor frontend
scp -r proxy-server.js package.json package-lock.json Dockerfile.proxy .env.production analytics-client.js backend/ user@frontend-server:/opt/cdnproxy/

# 2. Conectar ao servidor frontend
ssh user@frontend-server

# 3. Navegar para o diretório
cd /opt/cdnproxy

# 4. Construir a imagem Docker
docker build -f Dockerfile.proxy -t cdnproxy-frontend .

# 5. Executar o container
docker run -d \
  --name cdnproxy-frontend \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env.production \
  cdnproxy-frontend

# 6. Verificar se está funcionando
docker logs cdnproxy-frontend
curl http://localhost:8080/health
```

### 3. Docker Compose (Recomendado)

Crie um arquivo `docker-compose.frontend.yml`:

```yaml
version: '3.8'

services:
  cdnproxy-frontend:
    build:
      context: .
      dockerfile: Dockerfile.proxy
    container_name: cdnproxy-frontend
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    networks:
      - cdnproxy-network

networks:
  cdnproxy-network:
    driver: bridge
```

Executar com:
```bash
docker-compose -f docker-compose.frontend.yml up -d
```

## 🔄 Múltiplas APIs Backend

### Configuração Implementada

O `proxy-server.js` foi modificado para suportar múltiplas APIs backend:

```javascript
const BACKEND_APIS = [
  'https://api.cdnproxy.top',
  'https://gf.proxysrv.top',
  // Adicione mais APIs conforme necessário
];
```

### Funcionalidades

1. **Rotação Automática**: As APIs são utilizadas em rotação
2. **Fallback**: Se uma API falhar, tenta a próxima
3. **Fallback Local**: Se todas as APIs remotas falharem, usa geolocalização local
4. **Logs Detalhados**: Registra qual API foi utilizada e status

### Adicionando Novas APIs

Para adicionar uma nova API backend:

1. Adicione a URL no array `BACKEND_APIS`
2. Certifique-se de que a nova API tenha o endpoint `/api/test/geolocation`
3. Reinicie o container

## 🌐 Configuração do Nginx (Opcional)

Se usar Nginx como proxy reverso:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 🔍 Monitoramento e Logs

### Health Check

```bash
# Verificar saúde do serviço
curl http://localhost:8080/health

# Verificar estatísticas de geolocalização
curl http://localhost:8080/geo-stats
```

### Logs do Docker

```bash
# Ver logs em tempo real
docker logs -f cdnproxy-frontend

# Ver últimas 100 linhas
docker logs --tail 100 cdnproxy-frontend
```

### Métricas Importantes

- ✅ Status das APIs backend
- 🌍 Cache hits/misses de geolocalização
- 📊 Tempo de resposta das APIs
- 🔄 Rotação entre APIs

## 🚀 Validação do Deploy

### 1. Testes Básicos

```bash
# 1. Health check
curl http://localhost:8080/health

# 2. Teste de geolocalização
curl -X POST http://localhost:8080/api/test-geolocation \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}'

# 3. Teste com domínio personalizado
curl -H "Host: seu-dominio.com" http://localhost:8080/
```

### 2. Verificar Logs

```bash
# Verificar se as múltiplas APIs estão sendo utilizadas
docker logs cdnproxy-frontend | grep "API"

# Verificar geolocalização
docker logs cdnproxy-frontend | grep "GEO"
```

### 3. Teste de Failover

1. Desative temporariamente uma API backend
2. Verifique se o sistema automaticamente usa a próxima API
3. Confirme que não há interrupção no serviço

## 📝 Checklist de Deploy

- [ ] Arquivos copiados para o servidor frontend
- [ ] Variáveis de ambiente configuradas
- [ ] Docker instalado e funcionando
- [ ] Container construído com sucesso
- [ ] Container executando sem erros
- [ ] Health check respondendo
- [ ] Múltiplas APIs testadas
- [ ] Logs sem erros críticos
- [ ] Domínios personalizados funcionando
- [ ] Nginx configurado (se aplicável)
- [ ] Monitoramento configurado

## 🔧 Troubleshooting

### Problemas Comuns

1. **Container não inicia**
   - Verificar variáveis de ambiente
   - Verificar logs: `docker logs cdnproxy-frontend`

2. **APIs backend não respondem**
   - Verificar conectividade de rede
   - Testar APIs manualmente

3. **Geolocalização não funciona**
   - Verificar configuração do Supabase
   - Verificar logs de geolocalização

4. **Domínios não funcionam**
   - Verificar DNS
   - Verificar configuração no banco de dados

### Comandos Úteis

```bash
# Reiniciar container
docker restart cdnproxy-frontend

# Reconstruir imagem
docker build -f Dockerfile.proxy -t cdnproxy-frontend . --no-cache

# Verificar recursos
docker stats cdnproxy-frontend

# Entrar no container
docker exec -it cdnproxy-frontend sh
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs detalhados
2. Testar APIs individualmente
3. Verificar configuração de rede
4. Consultar documentação do Docker

---

**Nota**: Este guia assume que o servidor backend já está funcionando corretamente em `https://api.cdnproxy.top` e `https://gf.proxysrv.top`.