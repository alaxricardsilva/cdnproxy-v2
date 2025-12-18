# 💡 Exemplos Práticos - CDN Proxy Backend

## 📋 Índice

1. [Implementar Nova Funcionalidade Completa](#implementar-nova-funcionalidade-completa)
2. [Adicionar Gateway de Pagamento](#adicionar-gateway-de-pagamento)
3. [Criar Sistema de Notificações](#criar-sistema-de-notificações)
4. [Implementar Rate Limiting](#implementar-rate-limiting)
5. [Adicionar Novo Tipo de Analytics](#adicionar-novo-tipo-de-analytics)
6. [Criar Middleware Customizado](#criar-middleware-customizado)
7. [Implementar Exportação de Relatórios](#implementar-exportação-de-relatórios)
8. [Adicionar Webhook Customizado](#adicionar-webhook-customizado)

---

## 🎯 1. Implementar Nova Funcionalidade Completa

### Caso de Uso: Sistema de Favoritos

Vamos implementar um sistema onde usuários podem favoritar domínios.

#### Passo 1: Criar Tabela no Supabase

```sql
-- Tabela de favoritos
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain_id)
);

-- Índices para performance
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_domain_id ON favorites(domain_id);
```

#### Passo 2: Criar API para Listar Favoritos

```typescript
// backend/server/api/favorites/index.get.ts
import { requireUserAuth } from '~/utils/hybrid-auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // 1. Autenticar usuário
    const { user, supabase } = await requireUserAuth(event)
    
    // 2. Buscar favoritos com dados dos domínios
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select(`
        id,
        created_at,
        domain:domains (
          id,
          domain,
          target_url,
          status,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw createError({
        statusCode: 500,
        message: 'Erro ao buscar favoritos'
      })
    }
    
    // 3. Log da operação
    logger.info('Favoritos listados', {
      userId: user.id,
      count: favorites?.length || 0
    })
    
    // 4. Retornar resposta
    return {
      success: true,
      favorites: favorites || [],
      total: favorites?.length || 0
    }
    
  } catch (error: any) {
    logger.error('Erro ao listar favoritos', error)
    throw error
  }
})
```

#### Passo 3: Criar API para Adicionar Favorito

```typescript
// backend/server/api/favorites/index.post.ts
import { requireUserAuth } from '~/utils/hybrid-auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { user, supabase } = await requireUserAuth(event)
    
    // 1. Ler e validar body
    const body = await readBody(event)
    const { domainId } = body
    
    if (!domainId) {
      throw createError({
        statusCode: 400,
        message: 'domainId é obrigatório'
      })
    }
    
    // 2. Verificar se domínio existe e pertence ao usuário
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()
    
    if (domainError || !domain) {
      throw createError({
        statusCode: 404,
        message: 'Domínio não encontrado'
      })
    }
    
    // 3. Verificar se já é favorito
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain_id', domainId)
      .single()
    
    if (existing) {
      throw createError({
        statusCode: 409,
        message: 'Domínio já está nos favoritos'
      })
    }
    
    // 4. Adicionar favorito
    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        domain_id: domainId
      })
      .select()
      .single()
    
    if (error) {
      throw createError({
        statusCode: 500,
        message: 'Erro ao adicionar favorito'
      })
    }
    
    logger.info('Favorito adicionado', {
      userId: user.id,
      domainId,
      favoriteId: favorite.id
    })
    
    return {
      success: true,
      favorite,
      message: 'Domínio adicionado aos favoritos'
    }
    
  } catch (error: any) {
    logger.error('Erro ao adicionar favorito', error)
    throw error
  }
})
```

#### Passo 4: Criar API para Remover Favorito

```typescript
// backend/server/api/favorites/[id].delete.ts
import { requireUserAuth } from '~/utils/hybrid-auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { user, supabase } = await requireUserAuth(event)
    
    // 1. Obter ID do favorito
    const favoriteId = getRouterParam(event, 'id')
    
    if (!favoriteId) {
      throw createError({
        statusCode: 400,
        message: 'ID do favorito é obrigatório'
      })
    }
    
    // 2. Verificar se favorito existe e pertence ao usuário
    const { data: favorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('id', favoriteId)
      .eq('user_id', user.id)
      .single()
    
    if (!favorite) {
      throw createError({
        statusCode: 404,
        message: 'Favorito não encontrado'
      })
    }
    
    // 3. Remover favorito
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', user.id)
    
    if (error) {
      throw createError({
        statusCode: 500,
        message: 'Erro ao remover favorito'
      })
    }
    
    logger.info('Favorito removido', {
      userId: user.id,
      favoriteId
    })
    
    return {
      success: true,
      message: 'Favorito removido com sucesso'
    }
    
  } catch (error: any) {
    logger.error('Erro ao remover favorito', error)
    throw error
  }
})
```

---

## 💳 2. Adicionar Gateway de Pagamento

### Caso de Uso: Integrar Stripe

#### Passo 1: Criar Cliente Stripe

```typescript
// backend/utils/stripe-client.ts
import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export interface StripeConfig {
  secretKey: string
  publicKey: string
  webhookSecret: string
  environment: 'test' | 'live'
}

export interface StripePaymentRequest {
  amount: number
  currency: string
  description: string
  customer: {
    name: string
    email: string
  }
  metadata?: Record<string, string>
}

export interface StripePaymentResponse {
  id: string
  clientSecret: string
  status: string
  amount: number
  currency: string
}

export class StripeClient {
  private config: StripeConfig
  private baseUrl: string

  constructor(config: StripeConfig) {
    this.config = config
    this.baseUrl = 'https://api.stripe.com/v1'
  }

  async createPaymentIntent(data: StripePaymentRequest): Promise<StripePaymentResponse> {
    const params = new URLSearchParams({
      amount: (data.amount * 100).toString(), // Converter para centavos
      currency: data.currency.toLowerCase(),
      description: data.description,
      'metadata[customer_name]': data.customer.name,
      'metadata[customer_email]': data.customer.email,
      ...Object.entries(data.metadata || {}).reduce((acc, [key, value]) => ({
        ...acc,
        [`metadata[${key}]`]: value
      }), {})
    })

    const response = await fetch(`${this.baseUrl}/payment_intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Stripe API Error: ${error.error?.message || 'Unknown error'}`)
    }

    const result = await response.json()
    
    return {
      id: result.id,
      clientSecret: result.client_secret,
      status: result.status,
      amount: result.amount / 100,
      currency: result.currency
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get payment intent: ${response.status}`)
    }

    return await response.json()
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`
      }
    })

    return response.ok
  }

  validateWebhook(payload: string, signature: string): boolean {
    // Implementar validação de webhook do Stripe
    // usando stripe.webhooks.constructEvent
    return true
  }
}

// Buscar configuração do banco
export async function getStripeConfig(): Promise<StripeConfig | null> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('provider', 'stripe')
      .eq('active', true)
      .single()

    if (error || !data) {
      logger.info('Stripe configuration not found or inactive')
      return null
    }

    return {
      secretKey: data.secret_key,
      publicKey: data.public_key,
      webhookSecret: data.webhook_secret,
      environment: data.environment || 'test'
    }
  } catch (error) {
    logger.error('Error fetching Stripe config:', error)
    return null
  }
}

// Singleton
let stripeClient: StripeClient | null = null

export async function getStripeClient(): Promise<StripeClient | null> {
  if (!stripeClient) {
    const config = await getStripeConfig()
    if (config) {
      stripeClient = new StripeClient(config)
    }
  }
  return stripeClient
}
```

#### Passo 2: Criar API para Pagamento

```typescript
// backend/server/api/payments/stripe/create.post.ts
import { requireUserAuth } from '~/utils/hybrid-auth'
import { getStripeClient } from '~/utils/stripe-client'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { user, supabase } = await requireUserAuth(event)
    
    // 1. Obter dados do pagamento
    const body = await readBody(event)
    const { planId } = body
    
    // 2. Buscar plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()
    
    if (planError || !plan) {
      throw createError({
        statusCode: 404,
        message: 'Plano não encontrado'
      })
    }
    
    // 3. Criar payment intent no Stripe
    const stripeClient = await getStripeClient()
    
    if (!stripeClient) {
      throw createError({
        statusCode: 503,
        message: 'Stripe não configurado'
      })
    }
    
    const payment = await stripeClient.createPaymentIntent({
      amount: plan.price,
      currency: 'BRL',
      description: `Plano ${plan.name}`,
      customer: {
        name: user.name || user.email,
        email: user.email
      },
      metadata: {
        userId: user.id,
        planId: plan.id,
        planName: plan.name
      }
    })
    
    // 4. Salvar transação
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: plan.price,
        currency: 'BRL',
        status: 'pending',
        gateway: 'stripe',
        payment_id: payment.id
      })
      .select()
      .single()
    
    logger.info('Stripe payment created', {
      userId: user.id,
      planId,
      paymentId: payment.id,
      transactionId: transaction?.id
    })
    
    return {
      success: true,
      payment: {
        id: payment.id,
        clientSecret: payment.clientSecret,
        amount: payment.amount,
        currency: payment.currency
      },
      transactionId: transaction?.id
    }
    
  } catch (error: any) {
    logger.error('Error creating Stripe payment', error)
    throw error
  }
})
```

#### Passo 3: Webhook do Stripe

```typescript
// backend/server/api/payments/stripe/webhook.post.ts
import { getStripeClient } from '~/utils/stripe-client'
import { getSystemClient } from '~/utils/hybrid-auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const signature = getHeader(event, 'stripe-signature')
    const body = await readRawBody(event)
    
    if (!signature || !body) {
      throw createError({
        statusCode: 400,
        message: 'Invalid webhook'
      })
    }
    
    const stripeClient = await getStripeClient()
    
    if (!stripeClient) {
      throw createError({
        statusCode: 503,
        message: 'Stripe not configured'
      })
    }
    
    // Validar webhook
    const isValid = stripeClient.validateWebhook(body, signature)
    
    if (!isValid) {
      throw createError({
        statusCode: 401,
        message: 'Invalid signature'
      })
    }
    
    const webhookEvent = JSON.parse(body)
    
    // Processar evento
    if (webhookEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = webhookEvent.data.object
      
      const supabase = getSystemClient()
      
      // Atualizar transação
      const { data: transaction } = await supabase
        .from('transactions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('payment_id', paymentIntent.id)
        .select()
        .single()
      
      if (transaction) {
        // Ativar plano do usuário
        await supabase
          .from('users')
          .update({
            plan_id: transaction.plan_id,
            plan_started_at: new Date().toISOString(),
            plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', transaction.user_id)
        
        logger.info('Stripe payment processed', {
          paymentId: paymentIntent.id,
          transactionId: transaction.id
        })
      }
    }
    
    return { received: true }
    
  } catch (error: any) {
    logger.error('Stripe webhook error', error)
    throw error
  }
})
```

---

## 📧 3. Criar Sistema de Notificações

### Email Helper

```typescript
// backend/utils/email-helper.ts
import { logger } from './logger'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailService {
  private apiKey: string
  private fromEmail: string

  constructor() {
    this.apiKey = process.env.EMAIL_API_KEY || ''
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@cdnproxy.top'
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Exemplo com SendGrid
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: options.to }]
          }],
          from: { email: this.fromEmail },
          subject: options.subject,
          content: [
            {
              type: 'text/html',
              value: options.html
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`Email send failed: ${response.status}`)
      }

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject
      })

      return true
    } catch (error) {
      logger.error('Error sending email', error as Error)
      return false
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const html = `
      <h1>Bem-vindo ao CDN Proxy, ${userName}!</h1>
      <p>Sua conta foi criada com sucesso.</p>
      <p>Comece adicionando seu primeiro domínio.</p>
    `

    return await this.sendEmail({
      to: userEmail,
      subject: 'Bem-vindo ao CDN Proxy',
      html
    })
  }

  async sendPaymentConfirmation(
    userEmail: string,
    planName: string,
    amount: number
  ): Promise<boolean> {
    const html = `
      <h1>Pagamento Confirmado!</h1>
      <p>Seu pagamento de R$ ${amount.toFixed(2)} foi confirmado.</p>
      <p>Plano: ${planName}</p>
      <p>Obrigado por usar o CDN Proxy!</p>
    `

    return await this.sendEmail({
      to: userEmail,
      subject: 'Pagamento Confirmado - CDN Proxy',
      html
    })
  }
}

// Singleton
let emailService: EmailService | null = null

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService()
  }
  return emailService
}
```

---

## 🚦 4. Implementar Rate Limiting

```typescript
// backend/utils/rate-limiter.ts
import { getRedisClient } from './redis'
import { logger } from './logger'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const redis = getRedisClient()
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    try {
      // Usar sorted set do Redis
      const redisKey = `ratelimit:${key}`
      
      // Remover requisições antigas
      await redis.zremrangebyscore(redisKey, 0, windowStart)
      
      // Contar requisições no período
      const count = await redis.zcard(redisKey)
      
      if (count >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0
        }
      }
      
      // Adicionar nova requisição
      await redis.zadd(redisKey, now, `${now}`)
      await redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000))
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - count - 1
      }
      
    } catch (error) {
      logger.error('Rate limiter error', error as Error)
      // Em caso de erro, permitir requisição
      return {
        allowed: true,
        remaining: this.config.maxRequests
      }
    }
  }
}

// Configurações predefinidas
export const rateLimitConfigs = {
  user: new RateLimiter({ windowMs: 60000, maxRequests: 100 }),
  admin: new RateLimiter({ windowMs: 60000, maxRequests: 200 }),
  api: new RateLimiter({ windowMs: 60000, maxRequests: 1000 })
}
```

### Middleware de Rate Limiting

```typescript
// backend/server/middleware/1.rate-limit.ts
import { rateLimitConfigs } from '~/utils/rate-limiter'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // Ignorar rate limiting para health checks
  if (event.node.req.url?.includes('/health')) {
    return
  }
  
  // Obter IP do cliente
  const ip = getHeader(event, 'x-real-ip') || 
             getHeader(event, 'x-forwarded-for')?.split(',')[0] ||
             event.node.req.socket.remoteAddress
  
  if (!ip) return
  
  // Verificar rate limit
  const limiter = rateLimitConfigs.user
  const { allowed, remaining } = await limiter.checkLimit(ip)
  
  // Adicionar headers de rate limit
  setHeader(event, 'X-RateLimit-Limit', '100')
  setHeader(event, 'X-RateLimit-Remaining', remaining.toString())
  
  if (!allowed) {
    logger.warn('Rate limit exceeded', { ip })
    
    throw createError({
      statusCode: 429,
      message: 'Too many requests, please try again later'
    })
  }
})
```

---

## 📊 5. Adicionar Novo Tipo de Analytics

### Error Analytics

```typescript
// backend/utils/error-analytics.ts
import { getSystemClient } from './hybrid-auth'
import { logger } from './logger'

interface ErrorLog {
  domain_id: string
  error_type: 'network' | 'server' | 'client' | 'timeout' | 'unknown'
  error_code: number
  error_message: string
  endpoint: string
  client_ip: string
  user_agent: string
  occurred_at: Date
}

export async function logError(errorData: ErrorLog): Promise<void> {
  try {
    const supabase = getSystemClient()
    
    const { error } = await supabase
      .from('error_logs')
      .insert({
        ...errorData,
        occurred_at: errorData.occurred_at.toISOString()
      })
    
    if (error) {
      logger.error('Failed to log error to database', error)
    }
    
  } catch (err) {
    logger.error('Error in error logging', err as Error)
  }
}

export async function getErrorAnalytics(
  domainId: string,
  startDate: Date,
  endDate: Date
) {
  const supabase = getSystemClient()
  
  // Buscar erros
  const { data: errors, error } = await supabase
    .from('error_logs')
    .select('*')
    .eq('domain_id', domainId)
    .gte('occurred_at', startDate.toISOString())
    .lt('occurred_at', endDate.toISOString())
  
  if (error || !errors) {
    return {
      total_errors: 0,
      by_type: {},
      by_code: {},
      most_common: []
    }
  }
  
  // Agregar por tipo
  const byType = errors.reduce((acc, err) => {
    acc[err.error_type] = (acc[err.error_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Agregar por código
  const byCode = errors.reduce((acc, err) => {
    acc[err.error_code] = (acc[err.error_code] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  
  // Erros mais comuns
  const errorCounts = errors.reduce((acc, err) => {
    const key = `${err.error_code}-${err.endpoint}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const mostCommon = Object.entries(errorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([key, count]) => {
      const [code, endpoint] = key.split('-')
      return { code: parseInt(code), endpoint, count }
    })
  
  return {
    total_errors: errors.length,
    by_type: byType,
    by_code: byCode,
    most_common: mostCommon
  }
}
```

### API de Error Analytics

```typescript
// backend/server/api/analytics/errors-advanced.get.ts
import { requireUserAuth } from '~/utils/hybrid-auth'
import { getErrorAnalytics } from '~/utils/error-analytics'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserAuth(event)
  
  const query = getQuery(event)
  const domainId = query.domainId as string
  const days = parseInt(query.days as string) || 7
  
  if (!domainId) {
    throw createError({
      statusCode: 400,
      message: 'domainId is required'
    })
  }
  
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  
  const analytics = await getErrorAnalytics(domainId, startDate, endDate)
  
  return {
    success: true,
    period: { startDate, endDate, days },
    analytics
  }
})
```

---

**Versão:** 1.2.2  
**Última Atualização:** 25/10/2025
