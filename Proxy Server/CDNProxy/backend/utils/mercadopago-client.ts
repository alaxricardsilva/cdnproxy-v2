import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Interfaces para o MercadoPago
export interface MercadoPagoConfig {
  accessToken: string
  publicKey: string
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
  webhookSecret?: string
}

export interface MPPaymentRequest {
  amount: number
  currency: string
  description: string
  customer: {
    name: string
    email: string
    phone?: string
    document?: string
  }
  items: Array<{
    title: string
    quantity: number
    unit_price: number
    currency_id: string
  }>
  notification_url?: string
  back_urls?: {
    success: string
    failure: string
    pending: string
  }
  external_reference?: string
}

export interface MPPaymentResponse {
  id: number
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
  status_detail: string
  currency_id: string
  description: string
  transaction_amount: number
  date_created: string
  date_approved?: string
  money_release_date?: string
  payment_method_id: string
  payment_type_id: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code_base64?: string
      qr_code?: string
      ticket_url?: string
    }
  }
  external_reference?: string
  payer: {
    id?: string
    email: string
    identification?: {
      type: string
      number: string
    }
  }
}

export class MercadoPagoClient {
  private config: MercadoPagoConfig
  private baseUrl: string

  constructor(config: MercadoPagoConfig) {
    this.config = config
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com' // MercadoPago usa a mesma URL para sandbox
  }

  // Criar um pagamento PIX
  async createPixPayment(paymentData: MPPaymentRequest): Promise<MPPaymentResponse> {
    const paymentPayload = {
      transaction_amount: paymentData.amount,
      description: paymentData.description,
      payment_method_id: 'pix',
      payer: {
        email: paymentData.customer.email,
        first_name: paymentData.customer.name.split(' ')[0],
        last_name: paymentData.customer.name.split(' ').slice(1).join(' ') || paymentData.customer.name.split(' ')[0],
        identification: paymentData.customer.document ? {
          type: paymentData.customer.document.length === 11 ? 'CPF' : 'CNPJ',
          number: paymentData.customer.document
        } : undefined
      },
      notification_url: paymentData.notification_url,
      external_reference: paymentData.external_reference || `mp_${Date.now()}`,
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    }

    const response = await fetch(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`,
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentPayload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`MercadoPago API Error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    return await response.json()
  }

  // Criar uma preferência de pagamento (para checkout pro)
  async createPreference(paymentData: MPPaymentRequest): Promise<any> {
    const preferencePayload = {
      items: paymentData.items,
      payer: {
        name: paymentData.customer.name,
        email: paymentData.customer.email,
        phone: paymentData.customer.phone ? {
          area_code: paymentData.customer.phone.substring(0, 2),
          number: paymentData.customer.phone.substring(2)
        } : undefined,
        identification: paymentData.customer.document ? {
          type: paymentData.customer.document.length === 11 ? 'CPF' : 'CNPJ',
          number: paymentData.customer.document
        } : undefined
      },
      back_urls: paymentData.back_urls,
      notification_url: paymentData.notification_url,
      external_reference: paymentData.external_reference || `pref_${Date.now()}`,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }

    const response = await fetch(`${this.baseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`
      },
      body: JSON.stringify(preferencePayload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`MercadoPago Preference API Error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    return await response.json()
  }

  // Consultar status do pagamento
  async getPaymentStatus(paymentId: string): Promise<MPPaymentResponse> {
    const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get payment status: ${response.status}`)
    }

    return await response.json()
  }

  // Cancelar pagamento
  async cancelPayment(paymentId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`
      },
      body: JSON.stringify({
        status: 'cancelled'
      })
    })

    return response.ok
  }

  // Validar webhook do MercadoPago
  validateWebhook(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('Webhook secret not configured for MercadoPago')
      return false
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  // Processar notificação de webhook
  async processWebhookNotification(notificationId: string, topic: string): Promise<MPPaymentResponse | null> {
    if (topic !== 'payment') {
      return null
    }

    const response = await fetch(`${this.baseUrl}/v1/payments/${notificationId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to process webhook notification: ${response.status}`)
    }

    return await response.json()
  }

  // Testar conexão com a API
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      })
      return response.ok
    } catch (error) {
      logger.error('MercadoPago connection test failed:', error)
      return false
    }
  }
}

// Função para buscar configuração do MercadoPago do banco
export async function getMercadoPagoConfig(): Promise<MercadoPagoConfig | null> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('provider', 'mercadopago')
      .eq('active', true)
      .single()

    if (error || !data) {
      logger.info('MercadoPago configuration not found or inactive')
      return null
    }

    return {
      accessToken: data.access_token,
      publicKey: data.public_key,
      clientId: data.client_id,
      clientSecret: data.client_secret,
      environment: data.environment || 'sandbox',
      webhookSecret: data.webhook_secret
    }
  } catch (error) {
    logger.error('Error fetching MercadoPago config:', error)
    return null
  }
}

// Singleton para o cliente MercadoPago
let mercadoPagoClient: MercadoPagoClient | null = null

export async function getMercadoPagoClient(): Promise<MercadoPagoClient | null> {
  if (!mercadoPagoClient) {
    const config = await getMercadoPagoConfig()
    if (config) {
      mercadoPagoClient = new MercadoPagoClient(config)
    }
  }
  return mercadoPagoClient
}