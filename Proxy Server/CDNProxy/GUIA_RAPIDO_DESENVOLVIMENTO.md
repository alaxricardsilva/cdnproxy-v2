# 🚀 Guia Rápido de Desenvolvimento - CDN Proxy Backend

## 📋 Quick Reference

### Comandos Essenciais

```bash
# Desenvolvimento
npm run dev                    # Inicia servidor de desenvolvimento (porta 5001)

# Build e Deploy
npm run build                  # Build para produção
npm run preview               # Preview do build
npm start                     # Inicia produção

# Docker
docker build -t cdnproxy-backend:latest -f backend/Dockerfile backend/
docker run -p 5001:5001 cdnproxy-backend:latest

# Logs
docker logs -f cdnproxy-backend
docker logs cdnproxy-backend | grep ERROR
```

---

## 🔧 Configuração Rápida

### 1. Variáveis de Ambiente (.env.production)

```bash
NODE_ENV=production
PORT=5001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
JWT_SECRET=your-secret-here
REDIS_URL=redis://redis:6379
FRONTEND_URL=https://app.cdnproxy.top
```

### 2. Iniciar Projeto do Zero

```bash
# Clonar e instalar
cd backend
npm install

# Configurar .env
cp .env.example .env.production
# Editar variáveis

# Desenvolvimento
npm run dev

# Acessar
curl http://localhost:5001/api/health
```

---

## 📝 Como Criar uma Nova API

### Estrutura Básica

```typescript
// backend/server/api/exemplo/teste.get.ts
import { requireUserAuth } from '~/utils/hybrid-auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // 1. Autenticação (opcional)
    const { user, supabase } = await requireUserAuth(event)
    
    // 2. Validação de parâmetros
    const query = getQuery(event)
    const { id } = query
    
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'ID é obrigatório'
      })
    }
    
    // 3. Lógica de negócio
    const { data, error } = await supabase
      .from('tabela')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      throw createError({
        statusCode: 404,
        message: 'Não encontrado'
      })
    }
    
    // 4. Log
    logger.info('API acessada com sucesso', { userId: user.id, id })
    
    // 5. Resposta
    return {
      success: true,
      data
    }
    
  } catch (error: any) {
    logger.error('Erro na API', error)
    throw error
  }
})
```

### Com POST/PUT

```typescript
// backend/server/api/exemplo/criar.post.ts
export default defineEventHandler(async (event) => {
  const { user, supabase } = await requireUserAuth(event)
  
  // Ler body
  const body = await readBody(event)
  
  // Validar com Zod (opcional)
  const schema = z.object({
    nome: z.string().min(3),
    email: z.string().email()
  })
  
  const validated = schema.parse(body)
  
  // Inserir no banco
  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      nome: validated.nome,
      email: validated.email,
      user_id: user.id
    })
    .select()
    .single()
  
  if (error) throw createError({ statusCode: 500, message: error.message })
  
  return { success: true, data }
})
```

### Com Admin Auth

```typescript
// backend/server/api/admin/exemplo.get.ts
import { requireAdminAuth } from '~/utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  // Requer role ADMIN ou SUPERADMIN
  const { user, supabase } = await requireAdminAuth(event, 'ADMIN')
  
  // Resto da lógica...
})
```

---

## 🔐 Autenticação - Cheat Sheet

### Tipos de Auth

```typescript
// 1. Usuário comum
const { user, userProfile, supabase } = await requireUserAuth(event)

// 2. Admin
const { user, supabase } = await requireAdminAuth(event, 'ADMIN')

// 3. Superadmin
const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

// 4. Sem autenticação (sistema)
const supabase = getSystemClient()
```

### Headers de Autenticação

```typescript
// Cliente envia:
Authorization: Bearer <token>
// ou
X-Supabase-Token: <token>

// No código:
const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
```

---

## 📊 Analytics - Cheat Sheet

### Coletar Métricas

```typescript
import { collectAccessLog } from '~/utils/analytics-collector'

await collectAccessLog(event, {
  domainId: 'domain-123',
  domain: 'example.com',
  targetUrl: 'https://origin.com/video.mp4',
  responseTimeMs: 150,
  statusCode: 200,
  bytesTransferred: 1024000,
  bytesSent: 1024000,
  contentType: 'video/mp4'
})
```

### Usar Middleware de Analytics

```typescript
import { withAnalytics } from '~/utils/analytics-collector'

export default withAnalytics('domain-123', 'example.com')
```

---

## 💳 Pagamentos - Cheat Sheet

### Criar Pagamento

```typescript
import { getMercadoPagoClient } from '~/utils/mercadopago-client'

const client = await getMercadoPagoClient()

const payment = await client.createPixPayment({
  amount: 99.90,
  currency: 'BRL',
  description: 'Plano Premium',
  customer: {
    name: 'João Silva',
    email: 'joao@example.com',
    document: '12345678900'
  },
  items: [{
    title: 'Plano Premium',
    quantity: 1,
    unit_price: 99.90,
    currency_id: 'BRL'
  }]
})

// Retorna: { id, qrCode, pixCode, expiresAt }
```

### Processar Webhook

```typescript
// backend/server/api/payments/webhook.post.ts
const body = await readBody(event)

if (body.type === 'payment') {
  const client = await getMercadoPagoClient()
  const payment = await client.processWebhookNotification(
    body.data.id,
    body.type
  )
  
  if (payment.status === 'approved') {
    // Atualizar transação
    // Ativar plano do usuário
  }
}
```

---

## 📝 Logging - Cheat Sheet

### Logs Básicos

```typescript
import { logger } from '~/utils/logger'

// Info
logger.info('Mensagem', { metadata: 'opcional' })

// Warning
logger.warn('Aviso', { details: '...' })

// Error
logger.error('Erro', error, { context: '...' })

// Debug (apenas em dev)
logger.debug('Debug info', { data: '...' })
```

### Logs Especializados

```typescript
// API Request
logger.apiRequest(
  '/api/domains',  // endpoint
  'GET',           // method
  200,             // statusCode
  150,             // responseTime
  'user-123'       // userId
)

// Auth
logger.auth('login', true, 'user-123', 'user@example.com')

// Database
logger.database('SELECT', 'users', true, 50)
```

---

## 🛠️ Utilitários Comuns

### Redis Cache

```typescript
import { getRedisClient } from '~/utils/redis'

const redis = getRedisClient()

// Set com expiração
await redis.set('key', JSON.stringify(data), 'EX', 3600) // 1 hora

// Get
const cached = await redis.get('key')
const data = JSON.parse(cached || '{}')

// Delete
await redis.del('key')

// Pattern
await redis.keys('user:*')
```

### Geolocalização

```typescript
import { getGeoLocationFromIP } from '~/utils/geolocation-service'

const geo = await getGeoLocationFromIP('8.8.8.8')
// { country, city, countryCode, continent, latitude, longitude }
```

### IP Detection

```typescript
import { detectRealIP } from '~/utils/ip-detection'

const ipInfo = detectRealIP(event)
// { ip, source, headers }
```

### Plan Validation

```typescript
import { validateDomainCreation } from '~/utils/plan-validation'

const validation = await validateDomainCreation(supabase, userId)

if (!validation.canCreate) {
  throw createError({
    statusCode: 400,
    message: validation.reason
  })
}
```

---

## 🔄 Background Tasks

### Agendar Tarefa

```typescript
import { 
  scheduleAnalyticsAggregation,
  scheduleDataCleanup,
  scheduleBandwidthCalculation
} from '~/utils/background-tasks'

// Analytics
scheduleAnalyticsAggregation('domain-123', 'hourly')

// Cleanup
scheduleDataCleanup(90) // 90 dias

// Bandwidth
scheduleBandwidthCalculation('domain-123', 'daily')
```

### Status das Tarefas

```typescript
import { getBackgroundTasksStatus } from '~/utils/background-tasks'

const status = getBackgroundTasksStatus()
// { total, pending, running, completed, failed, tasks: [...] }
```

---

## 🚨 Sistema de Alertas

### Verificar Alertas

```typescript
import { alertManager } from '~/utils/alerts'

// Verificar com métricas atuais
const newAlerts = alertManager.checkAlerts(metrics)

// Obter ativos
const activeAlerts = alertManager.getActiveAlerts()

// Resolver
alertManager.resolveAlert('alert-id')

// Auto-resolução
const resolved = alertManager.autoResolveAlerts(metrics)
```

### Adicionar Regra Customizada

```typescript
alertManager.addCustomRule({
  id: 'custom-rule',
  name: 'Minha Regra',
  condition: (metrics) => metrics.value > 100,
  severity: 'high',
  message: 'Valor muito alto',
  cooldown: 10,
  enabled: true
})
```

---

## 📦 Supabase Queries

### Select

```typescript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

// Com join
const { data, error } = await supabase
  .from('domains')
  .select(`
    *,
    plans!inner(name, max_domains),
    users!inner(email, name)
  `)
  .eq('user_id', userId)
```

### Insert

```typescript
const { data, error } = await supabase
  .from('domains')
  .insert({
    domain: 'example.com',
    user_id: userId,
    plan_id: planId
  })
  .select()
  .single()
```

### Update

```typescript
const { data, error } = await supabase
  .from('domains')
  .update({ status: 'active' })
  .eq('id', domainId)
  .select()
```

### Delete

```typescript
const { error } = await supabase
  .from('domains')
  .delete()
  .eq('id', domainId)
```

### Filtros Avançados

```typescript
const { data } = await supabase
  .from('access_logs')
  .select('*')
  .gte('created_at', startDate)
  .lt('created_at', endDate)
  .eq('domain_id', domainId)
  .order('created_at', { ascending: false })
  .limit(100)
```

---

## 🎯 Tratamento de Erros

### Padrão Recomendado

```typescript
export default defineEventHandler(async (event) => {
  try {
    // Lógica aqui
    
  } catch (error: any) {
    logger.error('Erro na API', error, {
      endpoint: event.node.req.url,
      method: event.node.req.method
    })
    
    // Erro conhecido
    if (error.statusCode) {
      throw error
    }
    
    // Erro genérico
    throw createError({
      statusCode: 500,
      message: 'Erro interno do servidor'
    })
  }
})
```

### Criar Erros Customizados

```typescript
// Bad Request
throw createError({
  statusCode: 400,
  message: 'Dados inválidos'
})

// Unauthorized
throw createError({
  statusCode: 401,
  message: 'Não autorizado'
})

// Forbidden
throw createError({
  statusCode: 403,
  message: 'Sem permissão'
})

// Not Found
throw createError({
  statusCode: 404,
  message: 'Não encontrado'
})
```

---

## 🧪 Testes Rápidos

### Testar Endpoints

```bash
# Health check
curl http://localhost:5001/api/health

# Com autenticação
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5001/api/auth/me

# POST com body
curl -X POST http://localhost:5001/api/domains \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"domain":"test.com","target_url":"https://origin.com"}'

# Query parameters
curl "http://localhost:5001/api/domains?page=1&limit=10" \
     -H "Authorization: Bearer TOKEN"
```

### Testar com Postman

```json
// Headers
Authorization: Bearer <token>
Content-Type: application/json

// Body (POST/PUT)
{
  "campo": "valor"
}

// Query Params
page: 1
limit: 10
search: exemplo
```

---

## 📊 Monitoramento

### Health Checks

```bash
# Básico
curl http://localhost:5001/api/health

# Completo
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:5001/api/system/health

# Métricas Prometheus
curl http://localhost:5001/api/metrics
```

### Ver Logs em Tempo Real

```bash
# Todos os logs
docker logs -f cdnproxy-backend

# Apenas erros
docker logs -f cdnproxy-backend | grep ERROR

# Últimos 100
docker logs --tail 100 cdnproxy-backend

# Desde 5 minutos atrás
docker logs --since 5m cdnproxy-backend
```

---

## 🔍 Debug

### Ativar Debug Logs

```bash
# .env.production
NODE_ENV=development
```

### Debug de Autenticação

```typescript
// Adicionar logs temporários
logger.info('🔍 Debug Auth', {
  headers: event.node.req.headers,
  token: getHeader(event, 'authorization'),
  userId: user?.id
})
```

### Debug de Database

```typescript
logger.info('🔍 Debug Query', {
  table: 'users',
  query: { id: userId },
  result: data
})
```

---

## 💡 Dicas e Boas Práticas

### 1. Sempre use try-catch

```typescript
export default defineEventHandler(async (event) => {
  try {
    // código
  } catch (error) {
    logger.error('Erro', error)
    throw createError({ statusCode: 500, message: 'Erro interno' })
  }
})
```

### 2. Valide inputs

```typescript
// Com Zod
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  idade: z.number().min(18)
})

const validated = schema.parse(body)
```

### 3. Use cache quando possível

```typescript
const cached = await redis.get(`analytics:${domainId}`)
if (cached) return JSON.parse(cached)

// Query pesada...
const data = await calculateAnalytics()

await redis.set(`analytics:${domainId}`, JSON.stringify(data), 'EX', 3600)
```

### 4. Log tudo importante

```typescript
logger.info('Ação executada', {
  userId: user.id,
  action: 'create_domain',
  domainId: newDomain.id
})
```

### 5. Use TypeScript

```typescript
interface User {
  id: string
  email: string
  role: 'USER' | 'ADMIN' | 'SUPERADMIN'
}

const user: User = await getUser(userId)
```

---

## 🚀 Deploy Rápido

### Build e Deploy

```bash
# 1. Build
cd backend
npm run build

# 2. Testar build
npm run preview

# 3. Deploy com Docker
docker build -t cdnproxy-backend:latest -f Dockerfile .
docker push registry/cdnproxy-backend:latest

# 4. Run em produção
docker run -d \
  --name cdnproxy-backend \
  -p 5001:5001 \
  --env-file .env.production \
  cdnproxy-backend:latest
```

### Deploy com Docker Compose

```bash
# Iniciar
docker-compose up -d backend

# Atualizar
docker-compose pull backend
docker-compose up -d backend

# Ver logs
docker-compose logs -f backend
```

---

## 📚 Referências Rápidas

### Estrutura de Response Padrão

```typescript
// Sucesso
{
  success: true,
  data: {...},
  message: "Operação bem-sucedida"
}

// Erro
{
  error: true,
  statusCode: 400,
  message: "Descrição do erro"
}

// Lista com paginação
{
  success: true,
  data: [...],
  pagination: {
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10
  }
}
```

### Status Codes

- **200**: OK
- **201**: Created
- **204**: No Content
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **500**: Internal Server Error

---

## 🎓 Recursos Adicionais

- **Documentação Completa**: `DOCUMENTACAO_BACKEND_COMPLETA.md`
- **APIs Detalhadas**: `DOCUMENTACAO_APIS_DETALHADAS.md`
- **Diagramas**: `DIAGRAMAS_ARQUITETURA_BACKEND.md`
- **Nuxt Docs**: https://nuxt.com/docs
- **Supabase Docs**: https://supabase.com/docs

---

**Versão:** 1.2.2  
**Última Atualização:** 25/10/2025
