import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

// Interfaces para o PagBank
export interface PagBankConfig {
  accessToken: string
  applicationId: string
  publicKey: string
  environment: 'sandbox' | 'production'
}

export interface PaymentRequest {
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
    name: string
    quantity: number
    unit_amount: number
  }>
  notification_urls?: string[]
  redirect_urls?: {
    success: string
    failure: string
    pending: string
  }
}

export interface PaymentResponse {
  id: string
  status: 'PAID' | 'WAITING' | 'DECLINED' | 'CANCELED'
  amount: {
    value: number
    currency: string
  }
  created_at: string
  links: Array<{
    rel: string
    href: string
    media?: string
    type?: string
  }>
  qr_codes?: Array<{
    id: string
    text: string
    links: Array<{
      rel: string
      href: string
      media: string
    }>
  }>
}

export class PagBankClient {
  private config: PagBankConfig
  private baseUrl: string

  constructor(config: PagBankConfig) {
    this.config = config
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com'
  }

  // Criar um pagamento
  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.accessToken}`,
        'x-api-version': '4.0'
      },
      body: JSON.stringify({
        reference_id: `order_${Date.now()}`,
        customer: {
          name: paymentData.customer.name,
          email: paymentData.customer.email,
          tax_id: paymentData.customer.document,
          phone: paymentData.customer.phone
        },
        items: paymentData.items,
        qr_codes: [
          {
            amount: {
              value: Math.round(paymentData.amount * 100), // Converter para centavos
              currency: paymentData.currency
            },
            expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
          }
        ],
        shipping: {
          address: {
            street: 'Rua Virtual',
            number: '123',
            complement: 'Digital',
            locality: 'Online',
            city: 'São Paulo',
            region_code: 'SP',
            country: 'BRA',
            postal_code: '01310-100'
          }
        },
        notification_urls: paymentData.notification_urls || []
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`PagBank API Error: ${error.error_messages?.[0]?.description || 'Unknown error'}`)
    }

    return await response.json()
  }

  // Consultar status de um pagamento
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    const response = await fetch(`${this.baseUrl}/orders/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'x-api-version': '4.0'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`PagBank API Error: ${error.error_messages?.[0]?.description || 'Payment not found'}`)
    }

    return await response.json()
  }

  // Cancelar um pagamento
  async cancelPayment(paymentId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/orders/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'x-api-version': '4.0'
      }
    })

    return response.ok
  }

  // Validar webhook do PagBank
  validateWebhook(payload: string, signature: string): boolean {
    // Implementar validação de assinatura do webhook
    // Por enquanto, retorna true para desenvolvimento
    return true
  }

  // Processar notificação do webhook
  async processWebhookNotification(notificationId: string): Promise<PaymentResponse> {
    const response = await fetch(`${this.baseUrl}/transactions/notifications/${notificationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'x-api-version': '4.0'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to process webhook notification')
    }

    return await response.json()
  }

  // Testar conexão com a API
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/public-keys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'x-api-version': '4.0'
        }
      })

      return response.ok
    } catch (error) {
      return false
    }
  }
}

// Função para obter configuração do PagBank do banco de dados
export async function getPagBankConfig(): Promise<PagBankConfig | null> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_pagbank')
      .single()

    if (error || !data) {
      return null
    }

    const config = JSON.parse(data.value)
    
    if (!config.enabled || !config.accessToken) {
      return null
    }

    return {
      accessToken: config.accessToken,
      applicationId: config.applicationId,
      publicKey: config.publicKey,
      environment: config.environment || 'sandbox'
    }
  } catch (error) {
    logger.error('Error getting PagBank config:', error)
    return null
  }
}

// Instância global do cliente PagBank
let pagBankClient: PagBankClient | null = null

export async function getPagBankClient(): Promise<PagBankClient | null> {
  if (!pagBankClient) {
    const config = await getPagBankConfig()
    if (config) {
      pagBankClient = new PagBankClient(config)
    }
  }
  return pagBankClient
}