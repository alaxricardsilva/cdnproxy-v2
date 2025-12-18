import { logger } from '~/utils/logger'
import { defineEventHandler, readBody, createError, getCookie, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getPagBankClient } from '../../../utils/pagbank-client'
import { verifyJWT } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação
    const token = getCookie(event, 'auth-token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    const body = await readBody(event)
    const { planId, billingCycle = 'monthly' } = body

    if (!planId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Plan ID é obrigatório'
      })
    }

    // Conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar informações do plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('active', true)
      .single()

    if (planError || !plan) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Plano não encontrado'
      })
    }

    // Buscar informações do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    // Calcular valor baseado no ciclo de cobrança
    let amount = parseFloat(plan.price)
    let description = `${plan.name} - Mensal`
    
    if (billingCycle === 'yearly') {
      amount = amount * 12 * 0.9 // 10% de desconto anual
      description = `${plan.name} - Anual`
    }

    // Obter cliente PagBank
    const pagBankClient = await getPagBankClient()
    if (!pagBankClient) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Gateway de pagamento não configurado'
      })
    }

    // Criar pagamento no PagBank
    const paymentRequest = {
      amount,
      currency: 'BRL',
      description,
      customer: {
        name: user.full_name || user.email,
        email: user.email,
        phone: user.phone,
        document: user.document
      },
      items: [
        {
          name: plan.name,
          quantity: 1,
          unit_amount: Math.round(amount * 100) // Converter para centavos
        }
      ],
      notification_urls: [
        `${process.env.BASE_URL}/api/payments/webhook`
      ],
      redirect_urls: {
        success: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
        failure: `${process.env.FRONTEND_URL}/plans?payment=failed`,
        pending: `${process.env.FRONTEND_URL}/dashboard?payment=pending`
      }
    }

    const pagBankResponse = await pagBankClient.createPayment(paymentRequest)

    // Salvar transação no banco de dados
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: payload.userId,
        plan_id: planId,
        amount,
        currency: 'BRL',
        status: 'pending',
        payment_method: 'pix',
        billing_cycle: billingCycle,
        external_id: pagBankResponse.id,
        gateway: 'pagbank',
        gateway_response: pagBankResponse,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      })
      .select()
      .single()

    if (transactionError) {
      logger.error('Error saving transaction:', transactionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao salvar transação'
      })
    }

    // Extrair informações do QR Code PIX
    const qrCode = pagBankResponse.qr_codes?.[0]
    const paymentLink = pagBankResponse.links?.find(link => link.rel === 'SELF')?.href

    return {
      success: true,
      data: {
        paymentId: transaction.id,
        externalId: pagBankResponse.id,
        status: pagBankResponse.status,
        amount,
        currency: 'BRL',
        description,
        expiresAt: transaction.expires_at,
        qrCode: qrCode ? {
          id: qrCode.id,
          text: qrCode.text,
          image: qrCode.links?.find(link => link.media === 'image/png')?.href
        } : null,
        paymentLink,
        createdAt: transaction.created_at
      }
    }

  } catch (error: any) {
    logger.error('Error creating payment:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})