# 📘 Documentação Completa do Backend - CDN Proxy

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Tecnologias](#tecnologias)
4. [Estrutura de Diretórios](#estrutura-de-diretórios)
5. [Configuração](#configuração)
6. [Autenticação e Autorização](#autenticação-e-autorização)
7. [APIs - Resumo](#apis-resumo)
8. [Utilitários](#utilitários)
9. [Middlewares](#middlewares)
10. [Sistema de Analytics](#sistema-de-analytics)
11. [Sistema de Pagamentos](#sistema-de-pagamentos)
12. [Sistema de Alertas](#sistema-de-alertas)
13. [Tarefas em Background](#tarefas-em-background)
14. [Logging](#logging)
15. [Deploy e Docker](#deploy-e-docker)
16. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O backend do CDN Proxy é uma aplicação **Node.js 20** baseada em **Nuxt 3** (modo SSR desabilitado, apenas APIs), construída com **TypeScript**. Ele fornece APIs REST para gerenciamento de domínios, analytics, pagamentos, autenticação e administração do sistema.

### Características Principais

- ✅ **APIs REST completas** para frontend e integrações
- 🔐 **Sistema híbrido de autenticação** (JWT + Supabase)
- 📊 **Analytics em tempo real** com coleta assíncrona
- 💳 **Integração com gateways de pagamento** (MercadoPago e PagBank)
- 🔔 **Sistema de alertas e monitoramento** automatizado
- 📝 **Logging estruturado** com níveis hierárquicos
- 🔄 **Tarefas em background** com queue assíncrona
- 🐳 **Docker multi-stage** para builds otimizados
- 🌍 **Geolocalização automática** com múltiplos providers
- 🚀 **Alta performance** com Redis caching

---

## 🏗️ Arquitetura

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Nuxt 3)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST
┌────────────────────▼────────────────────────────────────────┐
│                   NGINX (Reverse Proxy)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Backend API (Node.js/Nuxt)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Middlewares (CORS, Auth)                │  │
│  └────────┬─────────────────────────────────────────────┘  │
│           │                                                 │
│  ┌────────▼─────────────────────────────────────────────┐  │
│  │                 API Routes Layer                      │  │
│  │  • /api/auth     • /api/admin    • /api/superadmin   │  │
│  │  • /api/domains  • /api/payments • /api/analytics    │  │
│  │  • /api/system   • /api/proxy    • /api/plans        │  │
│  └────────┬─────────────────────────────────────────────┘  │
│           │                                                 │
│  ┌────────▼─────────────────────────────────────────────┐  │
│  │              Business Logic (Utils)                   │  │
│  │  • Auth       • Geolocation   • Payments             │  │
│  │  • Analytics  • Alerts        • Background Tasks     │  │
│  └────────┬─────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │
   ┌────────┴────────┬──────────────┬─────────────┐
   ▼                 ▼              ▼             ▼
┌──────┐      ┌──────────┐   ┌──────────┐  ┌──────────┐
│Redis │      │ Supabase │   │MercadoPago│  │ PagBank  │
│Cache │      │PostgreSQL│   │   API     │  │   API    │
└──────┘      └──────────┘   └──────────┘  └──────────┘
```

### Arquitetura de Camadas

1. **Camada de Apresentação**: Middlewares HTTP (CORS, Auth, HTTPS Redirect)
2. **Camada de Aplicação**: API Routes e Controllers
3. **Camada de Negócio**: Utils e Services
4. **Camada de Dados**: Supabase (PostgreSQL) + Redis
5. **Camada de Integração**: APIs externas (Pagamentos, Geolocalização)

---

## 💻 Tecnologias

### Stack Principal

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Node.js** | 20.19.0+ | Runtime JavaScript |
| **Nuxt** | 4.1.2 | Framework Full-stack |
| **TypeScript** | 5.7.2 | Linguagem tipada |
| **Supabase** | 2.74.0 | Backend-as-a-Service (PostgreSQL + Auth) |
| **Redis/IORedis** | 5.8.1 | Cache e rate limiting |
| **Docker** | - | Containerização |
| **NGINX** | - | Reverse proxy |

### Bibliotecas Principais

- **@supabase/supabase-js**: Cliente Supabase
- **ioredis**: Cliente Redis
- **jose**: JWT handling
- **jsonwebtoken**: JWT alternativo
- **bcryptjs**: Hash de senhas
- **speakeasy**: 2FA/TOTP
- **qrcode**: Geração de QR codes
- **node-cron**: Agendamento de tarefas
- **zod**: Validação de schemas
- **node-fetch**: HTTP client

---

## 📁 Estrutura de Diretórios

```
backend/
├── plugins/
│   └── dotenv.client.ts          # Carregamento de .env
├── server/
│   ├── api/                      # Rotas da API (200+ endpoints)
│   │   ├── admin/               # APIs administrativas (11 arquivos)
│   │   ├── analytics/           # Sistema de analytics (14 arquivos)
│   │   ├── auth/                # Autenticação e 2FA (10 arquivos)
│   │   ├── cron/                # Tarefas agendadas (1 arquivo)
│   │   ├── debug/               # Debug endpoints (3 arquivos)
│   │   ├── domain-status/       # Status de domínios (1 arquivo)
│   │   ├── domains/             # CRUD de domínios (7 arquivos)
│   │   ├── payments/            # Sistema de pagamentos (8 arquivos)
│   │   ├── plans/               # Planos e assinaturas (6 arquivos)
│   │   ├── proxy/               # Proxy CDN (2 arquivos)
│   │   ├── settings/            # Configurações (2 arquivos)
│   │   ├── streaming/           # Streaming HLS (3 arquivos)
│   │   ├── superadmin/          # APIs superadmin (56 arquivos)
│   │   ├── system/              # Sistema e manutenção (22 arquivos)
│   │   ├── test/                # Testes de API (3 arquivos)
│   │   └── [outros endpoints]   # Health, metrics, users
│   └── middleware/              # Middlewares HTTP (2 arquivos)
│       ├── 0.cors.ts            # CORS e Security Headers
│       └── 0.https-redirect.ts  # Redirecionamento HTTPS
├── utils/                       # Utilitários (20 arquivos)
│   ├── alerts.ts                # Sistema de alertas
│   ├── analytics-collector.ts   # Coletor de analytics
│   ├── auth.ts                  # Autenticação JWT básica
│   ├── background-tasks.ts      # Gerenciador de tarefas
│   ├── geolocation-service.ts   # Serviço de geolocalização
│   ├── hybrid-auth.ts           # Auth híbrida (JWT + Supabase)
│   ├── logger.ts                # Sistema de logging
│   ├── mercadopago-client.ts    # Cliente MercadoPago
│   ├── pagbank-client.ts        # Cliente PagBank
│   ├── plan-validation.ts       # Validação de planos
│   ├── redis.ts                 # Cliente Redis
│   └── [outros utils]
├── .env.production              # Variáveis de ambiente
├── Dockerfile                   # Container Docker
├── error.ts                     # Error handler global
├── nuxt.config.ts               # Configuração Nuxt
├── package.json                 # Dependências
└── tsconfig.json                # Configuração TypeScript
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (.env.production)

```bash
# Node
NODE_ENV=production
PORT=5001

# Supabase
SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# JWT
JWT_SECRET=your-super-secret-key-here

# Redis
REDIS_URL=redis://redis:6379

# Frontend
FRONTEND_URL=https://app.cdnproxy.top
```

### Configuração do Nuxt (nuxt.config.ts)

```typescript
export default defineNuxtConfig({
  ssr: false, // Apenas APIs, sem SSR
  
  nitro: {
    errorHandler: '~/error.ts'
  },

  routeRules: {
    '/api/**': { 
      cors: true,
      ssr: false,
      prerender: false
    }
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.JWT_SECRET,
    redisUrl: process.env.REDIS_URL
  }
})
```

---

## 🔐 Autenticação e Autorização

### Sistema Híbrido de Autenticação

O backend utiliza um **sistema híbrido** que suporta:

1. **JWT Local**: Tokens assinados com `JWT_SECRET` para admin local
2. **Supabase Auth**: Tokens do Supabase para usuários registrados

### Funções de Autenticação (utils/hybrid-auth.ts)

#### 1. `requireUserAuth(event)`
Valida token JWT local ou Supabase para usuários comuns.

```typescript
const { user, userProfile, supabase } = await requireUserAuth(event)
// user: { id, email, role }
// userProfile: Dados completos do usuário
// supabase: Cliente autenticado
```

#### 2. `requireAdminAuth(event, requiredRole)`
Valida admin/superadmin com verificação de role.

```typescript
const { user } = await requireAdminAuth(event, 'ADMIN')
// Roles aceitas: 'ADMIN' | 'SUPERADMIN'
```

#### 3. `getSystemClient()`
Retorna cliente Supabase com Service Role Key.

```typescript
const supabase = getSystemClient()
```

### Headers de Autenticação

```http
Authorization: Bearer <token>
X-Supabase-Token: <token>
```

### Fluxo de Autenticação

```
Cliente → Login → Token JWT/Supabase → Request com Token → 
Middleware valida → API Route autorizada → Response
```

---

## 🌐 APIs - Resumo

### Grupos de APIs

| Grupo | Endpoints | Descrição | Arquivos |
|-------|-----------|-----------|----------|
| **/api/auth** | 10+ | Autenticação, login, 2FA | 10 |
| **/api/domains** | 7 | CRUD de domínios | 7 |
| **/api/analytics** | 14 | Analytics e métricas | 14 |
| **/api/payments** | 8+ | Pagamentos e gateways | 8 |
| **/api/plans** | 6 | Planos e upgrades | 6 |
| **/api/admin** | 11+ | Administração | 11 |
| **/api/superadmin** | 56+ | Superadministração | 56 |
| **/api/system** | 22+ | Sistema e manutenção | 22 |
| **/api/proxy** | 2 | Proxy CDN/Stream | 2 |
| **/api/settings** | 2 | Configurações | 2 |

### Principais Endpoints

#### Authentication
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/2fa/setup` - Configurar 2FA

#### Domains
- `GET /api/domains` - Listar domínios
- `POST /api/domains` - Criar domínio
- `PUT /api/domains/:id` - Atualizar domínio
- `DELETE /api/domains/:id` - Deletar domínio

#### Analytics
- `GET /api/analytics/overview` - Visão geral
- `GET /api/analytics/:domainId` - Analytics por domínio
- `GET /api/analytics/bandwidth` - Uso de banda
- `GET /api/analytics/geo` - Geolocalização
- `POST /api/analytics/collect-access-log` - Coletar log

#### Payments
- `POST /api/payments/create` - Criar pagamento
- `GET /api/payments/list` - Listar pagamentos
- `POST /api/payments/webhook` - Webhook de pagamento

#### Superadmin (56 endpoints)
- `GET /api/superadmin/stats` - Estatísticas globais
- `GET /api/superadmin/analytics` - Analytics gerais
- `GET /api/superadmin/users` - Gerenciar usuários
- `GET /api/superadmin/domains` - Gerenciar domínios
- `GET /api/superadmin/system-health` - Saúde do sistema
- `GET /api/superadmin/performance` - Performance

#### System (22 endpoints)
- `GET /api/system/health` - Health check
- `GET /api/system/monitoring` - Monitoramento
- `GET /api/system/alerts` - Alertas do sistema
- `POST /api/system/cleanup` - Limpeza de dados
- `POST /api/system/backup` - Criar backup

---

## 🛠️ Utilitários

### 1. Logger (utils/logger.ts)

Sistema de logging estruturado com formato JSON.

```typescript
import { logger } from '~/utils/logger'

// Logs básicos
logger.info('Mensagem', { metadata })
logger.warn('Aviso', { metadata })
logger.error('Erro', error, { metadata })
logger.debug('Debug', { metadata })

// Logs especializados
logger.apiRequest(endpoint, method, statusCode, responseTime, userId)
logger.auth(action, success, userId, email)
logger.database(operation, table, success, responseTime)
```

**Formato de saída:**

```json
{
  "timestamp": "2025-10-25T10:30:00.000Z",
  "level": "info",
  "service": "ProxyCDN-Backend",
  "message": "Mensagem do log",
  "metadata": {}
}
```

### 2. Geolocation Service (utils/geolocation-service.ts)

Serviço de geolocalização com múltiplos providers e cache.

```typescript
// Obter geolocalização
const geo = await getGeoLocationFromIP('8.8.8.8')
// { country, city, countryCode, continent, latitude, longitude }

// Obter flag do país
const flag = getCountryFlag('BR') // 🇧🇷

// Obter coordenadas
const [lat, lon] = getCountryCoordinates('US')
```

**Providers:**
1. ip-api.com (rate limit: 100ms)
2. ipapi.co (rate limit: 1000ms)
3. ipinfo.io (rate limit: 1000ms)

**Cache:** 24 horas, máximo 1000 IPs

### 3. Analytics Collector (utils/analytics-collector.ts)

Sistema de coleta assíncrona de métricas.

```typescript
// Coletar log de acesso
await collectAccessLog(event, {
  domainId, domain, targetUrl,
  responseTimeMs, statusCode,
  bytesTransferred, bytesSent
})

// Coletar métricas HLS
await collectHLSMetrics(event, {
  domainId, sessionId, segmentUrl,
  bandwidthUsed, qualityLevel
})

// Coletar métricas de streaming
await collectStreamingMetrics(event, {
  domainId, sessionId, startTime,
  bandwidthConsumed
})
```

**Queue assíncrona:**
- Batch size: 50 itens
- Tamanho máximo: 1000 itens
- Processamento automático

### 4. Background Tasks (utils/background-tasks.ts)

Gerenciador de tarefas em background.

```typescript
// Agendar tarefas
scheduleAnalyticsAggregation('domain-123', 'hourly')
scheduleDataCleanup(90) // 90 dias retenção
scheduleReportGeneration('domain-123', 'monthly', 'email@example.com')
scheduleBandwidthCalculation('domain-123', 'daily')

// Status das tarefas
const status = getBackgroundTasksStatus()
```

**Tipos de tarefas:**
- Analytics Aggregation (a cada hora)
- Data Cleanup (a cada 24 horas)
- Report Generation (sob demanda)
- Bandwidth Calculation (a cada 6 horas)

### 5. Alerts Manager (utils/alerts.ts)

Sistema de alertas automáticos.

```typescript
import { alertManager } from '~/utils/alerts'

// Verificar alertas
const newAlerts = alertManager.checkAlerts(metrics)

// Obter alertas ativos
const activeAlerts = alertManager.getActiveAlerts()

// Resolver alerta
alertManager.resolveAlert('alert-id')

// Auto-resolução
const resolved = alertManager.autoResolveAlerts(metrics)
```

**Regras de alerta:**
- APIs críticas indisponíveis (critical)
- Problemas de autenticação (medium)
- Database indisponível (critical)
- Tempo de resposta alto (medium)
- Uso de memória alto >85% (high)
- Backend indisponível (critical)

### 6. Payment Clients

#### MercadoPago (utils/mercadopago-client.ts)

```typescript
const client = await getMercadoPagoClient()

// Criar pagamento PIX
const payment = await client.createPixPayment({
  amount: 100.00,
  description: 'Plano Premium',
  customer: { name, email, document }
})

// Consultar status
const status = await client.getPaymentStatus(paymentId)
```

#### PagBank (utils/pagbank-client.ts)

```typescript
const client = await getPagBankClient()

// Criar pagamento
const payment = await client.createPayment({
  amount: 100.00,
  description: 'Plano Premium',
  customer: { name, email }
})
```

### 7. Plan Validation (utils/plan-validation.ts)

```typescript
// Validar criação de domínio
const validation = await validateDomainCreation(supabase, userId)
if (validation.canCreate) {
  // Criar domínio
} else {
  // Erro: validation.reason
}

// Obter info do plano
const planInfo = await getUserPlanInfo(supabase, userId)
```

### 8. Redis Client (utils/redis.ts)

```typescript
import { getRedisClient, checkRedisHealth } from '~/utils/redis'

const redis = getRedisClient()

// Cache
await redis.set('key', 'value', 'EX', 3600)
const value = await redis.get('key')

// Health check
const health = await checkRedisHealth()
```

---

## 🚦 Middlewares

### 1. CORS Middleware (middleware/0.cors.ts)

Configura CORS e headers de segurança.

**Domínios permitidos:**
- https://app.cdnproxy.top
- https://api.cdnproxy.top
- http://localhost:3000
- http://localhost:5001

**Headers de segurança:**
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: default-src 'self'...

**Preflight (OPTIONS):** Retorna 204 No Content

### 2. HTTPS Redirect (middleware/0.https-redirect.ts)

Redireciona HTTP para HTTPS em produção.

**Regras:**
- Apenas em NODE_ENV=production
- Ignora rotas /api/**
- Redirecionamento 301

---

## 📊 Sistema de Analytics

### Arquitetura

```
Cliente → API Proxy → Analytics Queue → Supabase (async batch)
```

### Tabelas

1. **access_logs**: Logs de acesso
2. **hls_metrics**: Métricas HLS
3. **streaming_metrics**: Métricas de streaming

### Coleta

**Automática:**
```typescript
import { withAnalytics } from '~/utils/analytics-collector'
export default withAnalytics('domain-123', 'example.com')
```

**Manual:**
```typescript
await collectAccessLog(event, { ... })
```

### Agregação

- Automática: A cada 1 hora
- Manual: Via /api/system/analyze
- Períodos: hourly, daily, weekly, monthly

---

## 💳 Sistema de Pagamentos

### Gateways

1. **MercadoPago**: PIX instantâneo, Checkout Pro
2. **PagBank**: PIX, Boleto, QR Code

### Fluxo

```
1. POST /api/payments/create
2. Gateway cria pagamento
3. Cliente paga via PIX
4. Webhook atualiza transação
5. Sistema ativa plano
```

### Webhooks

- MercadoPago: /api/payments/mercadopago/webhook
- PagBank: /api/payments/pagbank/webhook

---

## 🔔 Sistema de Alertas

### Severidades

- **low**: Informacional
- **medium**: Atenção necessária
- **high**: Problema sério
- **critical**: Falha crítica

### Regras Predefinidas

1. APIs críticas indisponíveis (critical, 5min cooldown)
2. Problemas de auth (medium, 10min cooldown)
3. Database indisponível (critical, 2min cooldown)
4. Tempo de resposta alto (medium, 15min cooldown)
5. Uso de memória >85% (high, 20min cooldown)
6. Backend indisponível (critical, 1min cooldown)

---

## ⏱️ Tarefas em Background

### Agendamento Automático

```typescript
// A cada hora: analytics
setInterval(() => scheduleAnalyticsAggregation(), 3600000)

// A cada dia: cleanup
setInterval(() => scheduleDataCleanup(90), 86400000)

// A cada 6h: bandwidth
setInterval(() => scheduleBandwidthCalculation(), 21600000)
```

### API

```http
GET /api/system/background-tasks
```

---

## 📝 Logging

### Formato JSON

```json
{
  "timestamp": "2025-10-25T10:30:00.000Z",
  "level": "info",
  "service": "ProxyCDN-Backend",
  "message": "Mensagem",
  "metadata": {},
  "userId": "user-123",
  "requestId": "req-456"
}
```

### Visualização

```bash
# Logs completos
docker logs -f cdnproxy-backend

# Apenas erros
docker logs cdnproxy-backend | grep '"level":"error"'
```

---

## 🐳 Deploy e Docker

### Dockerfile Multi-Stage

**Estágios:**
1. base: Node.js 20 Alpine
2. deps: Instalação de dependências
3. builder: Build da aplicação
4. runner: Imagem de produção

### Build

```bash
docker build -t cdnproxy-backend:latest -f backend/Dockerfile backend/
```

### Docker Compose

```yaml
services:
  backend:
    image: cdnproxy-backend:latest
    ports:
      - "5001:5001"
    environment:
      NODE_ENV: production
      PORT: 5001
    depends_on:
      - redis
    restart: unless-stopped
```

### Execução

```bash
# Iniciar
docker-compose up -d

# Logs
docker-compose logs -f backend

# Restart
docker-compose restart backend
```

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Backend não inicia

```bash
# Verificar logs
docker logs cdnproxy-backend

# Verificar variáveis de ambiente
docker exec cdnproxy-backend env | grep SUPABASE
```

#### 2. Erros de autenticação

```bash
# Verificar JWT_SECRET
echo $JWT_SECRET

# Testar endpoint
curl -H "Authorization: Bearer TOKEN" http://localhost:5001/api/auth/me
```

#### 3. Redis não conecta

```bash
# Verificar Redis
docker exec cdnproxy-redis redis-cli ping

# Health check
curl http://localhost:5001/api/system/health
```

#### 4. Analytics não coleta

```bash
# Verificar queue
curl http://localhost:5001/api/system/background-tasks

# Verificar Supabase
docker logs cdnproxy-backend | grep "Supabase"
```

### Health Checks

```bash
# Health básico
curl http://localhost:5001/api/health

# Health completo
curl http://localhost:5001/api/system/health

# Métricas
curl http://localhost:5001/api/metrics
```

### Logs Úteis

```bash
# Últimos 100 logs
docker logs --tail 100 cdnproxy-backend

# Erros recentes
docker logs cdnproxy-backend | grep ERROR | tail -20

# Seguir logs em tempo real
docker logs -f --since 5m cdnproxy-backend
```

---

## 📚 Referências Técnicas

### Banco de Dados (Supabase)

**Tabelas Principais:**
- `users`: Usuários do sistema
- `domains`: Domínios cadastrados
- `plans`: Planos disponíveis
- `transactions`: Transações financeiras
- `access_logs`: Logs de acesso
- `hls_metrics`: Métricas HLS
- `streaming_metrics`: Métricas de streaming
- `payment_gateways`: Configuração de gateways
- `system_settings`: Configurações do sistema

### Variáveis de Ambiente Completas

```bash
# Node
NODE_ENV=production
PORT=5001

# Supabase
SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# JWT
JWT_SECRET=your-super-secret-key-here

# Redis
REDIS_URL=redis://redis:6379

# Frontend
FRONTEND_URL=https://app.cdnproxy.top

# APIs Externas (opcionais)
MERCADOPAGO_ACCESS_TOKEN=APP-xxx
PAGBANK_TOKEN=xxx
```

### Scripts Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview
npm run preview

# Start produção
npm start

# Start direto
npm run start:direct
```

---

## 📖 Conclusão

Esta documentação cobre todos os aspectos do backend do CDN Proxy, incluindo:

- ✅ Arquitetura e design do sistema
- ✅ Configuração e deploy
- ✅ APIs completas (200+ endpoints)
- ✅ Utilitários e helpers
- ✅ Sistema de autenticação híbrido
- ✅ Analytics e métricas
- ✅ Pagamentos integrados
- ✅ Alertas e monitoramento
- ✅ Logging estruturado
- ✅ Troubleshooting

**Versão do Backend:** 1.2.2  
**Node.js:** 20.19.0+  
**Última Atualização:** 25/10/2025

---

**Desenvolvido com ❤️ para CDN Proxy**
