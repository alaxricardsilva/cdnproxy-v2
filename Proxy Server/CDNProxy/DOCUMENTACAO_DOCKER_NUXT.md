# Documentação: Configuração Docker para Nuxt 4.1.2 - CDN Proxy

## Visão Geral

Este documento apresenta as configurações recomendadas para deploy do projeto CDN Proxy usando Docker com Nuxt 4.1.2, cobrindo dois cenários principais:

1. **Backend e Frontend no mesmo servidor**
2. **Backend e Frontend em servidores separados**

## Análise da Estrutura Atual

O projeto CDN Proxy possui uma arquitetura híbrida com:
- **Backend**: Nuxt.js configurado como API-only (SSR: false, pages: false)
- **Frontend**: Nuxt.js com interface completa
- **Banco de Dados**: Supabase (externo)
- **Cache**: Redis

## 1. Configuração para Mesmo Servidor

### 1.1 Estrutura Docker Compose

Para executar backend e frontend no mesmo servidor, você deve usar URLs internas do Docker para comunicação entre containers:

```yaml
# docker-compose.same-server.yml
version: '3.8'

services:
  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cdnproxy-backend
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=5001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    ports:
      - "5001:5001"
    depends_on:
      - redis
    networks:
      - cdnproxy-network
    restart: unless-stopped

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cdnproxy-frontend
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=3000
      - BACKEND_URL=http://backend:5001  # URL interna do Docker
      - API_URL=http://backend:5001
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - cdnproxy-network
    restart: unless-stopped

  # Redis
  redis:
    image: redis:7-alpine
    container_name: cdnproxy-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - cdnproxy-network
    restart: unless-stopped

  # Nginx Proxy (opcional)
  nginx:
    image: nginx:alpine
    container_name: cdnproxy-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - cdnproxy-network
    restart: unless-stopped

volumes:
  redis_data:

networks:
  cdnproxy-network:
    driver: bridge
```

### 1.2 Configuração .env para Mesmo Servidor

```bash
# .env.same-server
NODE_ENV=production

# URLs para comunicação interna (Docker)
BACKEND_URL=http://backend:5001
API_URL=http://backend:5001

# URLs públicas (para Nginx/proxy reverso)
FRONTEND_URL=https://app.cdnproxy.top
PUBLIC_BACKEND_URL=https://api.cdnproxy.top

# NextAuth.js
NEXTAUTH_URL=https://app.cdnproxy.top
NEXTAUTH_SECRET=23cjIKVdS9GQlxDoGd6GiQ3+ByUcOwLT6e6X0s3/SVY=
AUTH_SECRET=CqjqhTyvUXpumT32HfecgIPOY06Y710kl7vvppX7hjc=
AUTH_TRUST_HOST=true

# Configurações do servidor
HOST=0.0.0.0
FRONTEND_PORT=3000
BACKEND_PORT=5001

# Supabase (mantém as mesmas credenciais)
NEXT_PUBLIC_SUPABASE_URL=https://jyconxalcfqvqakrswnb.supabase.co
SUPABASE_URL=https://jyconxalcfqvqakrswnb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MzMyMzksImV4cCI6MjA3NDAwOTIzOX0.B9i9S1n9TxkeM3BHtuq1ZWs_25bugb92YkliWmCS7ok
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY

# Redis
REDIS_PASSWORD=L4JPcDDbNxKxyK8b

# JWT
JWT_SECRET=4FazpPqcN8GhtgZ2PzVhCsAiKni/HW+bHNii9lLEsYj3ZRAsAxVbtzu7tOiQeWYy/jrSRtAHLno06ZnXfXLXfA==
```

### 1.3 Configuração Nuxt.config.ts para Mesmo Servidor

**Backend (nuxt.config.ts):**
```typescript
export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  pages: false,
  components: false,
  
  nitro: {
    port: 5001,
    host: '0.0.0.0',
    serveStatic: false,
    errorHandler: '~/error.ts'
  },

  runtimeConfig: {
    // Configurações privadas (server-side)
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.JWT_SECRET,
    redisPassword: process.env.REDIS_PASSWORD,
    
    public: {
      // Configurações públicas (client-side)
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }
})
```

**Frontend (nuxt.config.ts):**
```typescript
export default defineNuxtConfig({
  devtools: { enabled: false },
  
  nitro: {
    port: 3000,
    host: '0.0.0.0'
  },

  runtimeConfig: {
    // URLs internas para comunicação server-side
    backendUrl: process.env.BACKEND_URL || 'http://backend:5001',
    apiUrl: process.env.API_URL || 'http://backend:5001',
    
    public: {
      // URLs públicas para client-side
      backendUrl: process.env.PUBLIC_BACKEND_URL || 'https://api.cdnproxy.top',
      apiUrl: process.env.PUBLIC_BACKEND_URL || 'https://api.cdnproxy.top',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }
})
```

## 2. Configuração para Servidores Separados

### 2.1 Estrutura para Servidor 1 (Backend)

```yaml
# docker-compose.server1.yml (Backend)
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cdnproxy-backend
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=5001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - CORS_ORIGIN=https://app.cdnproxy.top
    ports:
      - "5001:5001"
    depends_on:
      - redis
    networks:
      - backend-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: cdnproxy-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - backend-network
    restart: unless-stopped

volumes:
  redis_data:

networks:
  backend-network:
    driver: bridge
```

### 2.2 Estrutura para Servidor 2 (Frontend)

```yaml
# docker-compose.server2.yml (Frontend)
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cdnproxy-frontend
    environment:
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=3000
      - BACKEND_URL=https://api.cdnproxy.top  # URL pública do backend
      - API_URL=https://api.cdnproxy.top
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    networks:
      - frontend-network
    restart: unless-stopped

networks:
  frontend-network:
    driver: bridge
```

### 2.3 Configuração .env para Servidores Separados

**Servidor 1 (.env.server1 - Backend):**
```bash
NODE_ENV=production

# Configurações do backend
HOST=0.0.0.0
PORT=5001

# CORS para permitir frontend
CORS_ORIGIN=https://app.cdnproxy.top

# Supabase
SUPABASE_URL=https://jyconxalcfqvqakrswnb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY

# Redis
REDIS_PASSWORD=L4JPcDDbNxKxyK8b

# JWT
JWT_SECRET=4FazpPqcN8GhtgZ2PzVhCsAiKni/HW+bHNii9lLEsYj3ZRAsAxVbtzu7tOiQeWYy/jrSRtAHLno06ZnXfXLXfA==
```

**Servidor 2 (.env.server2 - Frontend):**
```bash
NODE_ENV=production

# URLs do backend (servidor 1)
BACKEND_URL=https://api.cdnproxy.top
API_URL=https://api.cdnproxy.top

# Configurações do frontend
HOST=0.0.0.0
PORT=3000
FRONTEND_URL=https://app.cdnproxy.top

# NextAuth.js
NEXTAUTH_URL=https://app.cdnproxy.top
NEXTAUTH_SECRET=23cjIKVdS9GQlxDoGd6GiQ3+ByUcOwLT6e6X0s3/SVY=
AUTH_SECRET=CqjqhTyvUXpumT32HfecgIPOY06Y710kl7vvppX7hjc=
AUTH_TRUST_HOST=true

# Supabase (apenas chaves públicas)
NEXT_PUBLIC_SUPABASE_URL=https://jyconxalcfqvqakrswnb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MzMyMzksImV4cCI6MjA3NDAwOTIzOX0.B9i9S1n9TxkeM3BHtuq1ZWs_25bugb92YkliWmCS7ok
```

## 3. Configurações Importantes do Nuxt 4.1.2

### 3.1 Runtime Config

O Nuxt 4.1.2 usa o sistema `runtimeConfig` que permite diferentes URLs para server-side e client-side:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Privado (server-side apenas)
    apiSecret: process.env.API_SECRET,
    backendUrl: process.env.BACKEND_URL, // URL interna para SSR
    
    public: {
      // Público (client-side e server-side)
      apiBase: process.env.PUBLIC_API_URL, // URL pública para client
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  }
})
```

### 3.2 Uso no Código

```typescript
// No servidor (composables, server API)
const config = useRuntimeConfig()
const response = await $fetch('/api/data', {
  baseURL: config.backendUrl // Usa URL interna
})

// No cliente
const config = useRuntimeConfig()
const response = await $fetch('/api/data', {
  baseURL: config.public.apiBase // Usa URL pública
})
```

## 4. Dockerfiles Recomendados

### 4.1 Dockerfile para Backend

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Configurar ambiente de produção
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5001

EXPOSE 5001

# Comando de inicialização
CMD ["node", ".output/server/index.mjs"]
```

### 4.2 Dockerfile para Frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Configurar ambiente de produção
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Comando de inicialização
CMD ["node", ".output/server/index.mjs"]
```

## 5. Comandos de Deploy

### 5.1 Mesmo Servidor

```bash
# Build e deploy
docker-compose -f docker-compose.same-server.yml --env-file .env.same-server up -d --build

# Verificar logs
docker-compose -f docker-compose.same-server.yml logs -f

# Parar serviços
docker-compose -f docker-compose.same-server.yml down
```

### 5.2 Servidores Separados

**Servidor 1 (Backend):**
```bash
docker-compose -f docker-compose.server1.yml --env-file .env.server1 up -d --build
```

**Servidor 2 (Frontend):**
```bash
docker-compose -f docker-compose.server2.yml --env-file .env.server2 up -d --build
```

## 6. Considerações de Segurança

1. **CORS**: Configure adequadamente para servidores separados
2. **HTTPS**: Use sempre HTTPS em produção
3. **Secrets**: Nunca exponha chaves privadas no frontend
4. **Network**: Use redes Docker isoladas
5. **Firewall**: Configure adequadamente entre servidores

## 7. Monitoramento e Logs

```yaml
# Adicionar ao docker-compose para logs centralizados
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 8. Troubleshooting

### Problemas Comuns:

1. **CORS Errors**: Verificar configuração de CORS no backend
2. **Environment Variables**: Usar `runtimeConfig` ao invés de `process.env` no cliente
3. **Network Issues**: Verificar se containers estão na mesma rede Docker
4. **Build Errors**: Verificar se todas as dependências estão instaladas

### Debug:

```bash
# Verificar containers
docker ps

# Logs específicos
docker logs cdnproxy-frontend
docker logs cdnproxy-backend

# Entrar no container
docker exec -it cdnproxy-frontend sh
```

---

**Nota**: Esta documentação é baseada nas melhores práticas do Nuxt 4.1.2 e Docker. Sempre teste em ambiente de desenvolvimento antes de aplicar em produção.