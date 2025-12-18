import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserAuth } from '../../../../utils/hybrid-auth'
import { getMercadoPagoClient } from '../../../../utils/mercadopago-client'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação usando sistema híbrido
    const { user, supabase } = await requireUserAuth(event)

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    const { planId, amount, description, customerData } = body

    // Validações básicas de presença
    if (!planId || !amount || !customerData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados obrigatórios: planId, amount, customerData'
      })
    }

    // Validações de tipo e formato
    if (typeof planId !== 'string' || planId.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'planId deve ser uma string válida'
      })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'amount deve ser um número maior que zero'
      })
    }

    if (!customerData || typeof customerData !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'customerData deve ser um objeto válido'
      })
    }

    // Validar campos obrigatórios do customerData
    const { name, email, document } = customerData
    if (!name || !email || !document) {
      throw createError({
        statusCode: 400,
        statusMessage: 'customerData deve conter: name, email, document'
      })
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nome do cliente deve ter pelo menos 2 caracteres'
      })
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email do cliente deve ter um formato válido'
      })
    }

    if (typeof document !== 'string' || document.trim().length < 11) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Documento do cliente deve ter pelo menos 11 caracteres'
      })
    }

    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    // Buscar dados do plano
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !planData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Plano não encontrado'
      })
    }

    // Obter cliente MercadoPago
    const mpClient = await getMercadoPagoClient()
    
    if (!mpClient) {
      throw createError({
        statusCode: 503,
        statusMessage: 'MercadoPago não configurado'
      })
    }

    // Preparar dados do pagamento
    const paymentData = {
      amount: amount,
      currency: 'BRL',
      description: description || `Assinatura do plano ${planData.name}`,
      customer: {
        name: customerData.name || userData.name || 'Cliente',
        email: customerData.email || userData.email,
        phone: customerData.phone,
        document: customerData.document
      },
      items: [{
        title: planData.name,
        quantity: 1,
        unit_price: amount,
        currency_id: 'BRL'
      }],
      notification_url: `${process.env.FRONTEND_URL}/api/payments/mercadopago/webhook`,
      back_urls: {
        success: `${process.env.FRONTEND_URL}/payment/success`,
        failure: `${process.env.FRONTEND_URL}/payment/failure`,
        pending: `${process.env.FRONTEND_URL}/payment/pending`
      },
      external_reference: `user_${user.id}_plan_${planId}_${Date.now()}`
    }

    // Criar pagamento PIX
    const mpPayment = await mpClient.createPixPayment(paymentData)

    // Salvar transação no banco
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: amount,
        currency: 'BRL',
        status: 'pending',
        payment_method: 'pix',
        gateway: 'mercadopago',
        gateway_transaction_id: mpPayment.id.toString(),
        gateway_response: mpPayment,
        external_reference: paymentData.external_reference,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      })
      .select()
      .single()

    if (transactionError) {
      logger.error('Erro ao salvar transação:', transactionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao processar pagamento'
      })
    }

    // Extrair dados do QR Code PIX
    const qrCodeData = mpPayment.point_of_interaction?.transaction_data

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        paymentId: mpPayment.id,
        status: mpPayment.status,
        amount: mpPayment.transaction_amount,
        currency: mpPayment.currency_id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        pix: {
          qrCode: qrCodeData?.qr_code,
          qrCodeBase64: qrCodeData?.qr_code_base64,
          copyPasteCode: qrCodeData?.qr_code
        },
        externalReference: paymentData.external_reference
      }
    }

  } catch (error: any) {
    logger.error('Erro ao criar pagamento MercadoPago:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})