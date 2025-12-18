import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, readBody, getHeader, getCookie } from 'h3'
import { getPagBankClient } from '../../../../utils/pagbank-client'

export default defineEventHandler(async (event: any) => {
  try {
    // Verificar autenticação
    const token = getCookie(event, 'auth-token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
    
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    // Verificar se o usuário está autenticado
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    const { data: user, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    const { planId, amount, customerData } = body

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
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.user.id)
      .single()

    if (userDataError || !userData) {
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

    // Obter cliente PagBank
    const pagBankClient = await getPagBankClient()
    
    if (!pagBankClient) {
      throw createError({
        statusCode: 503,
        statusMessage: 'PagBank não configurado'
      })
    }

    // Preparar dados do pagamento
    const paymentData = {
      amount: Math.round(amount * 100), // PagBank usa centavos
      currency: 'BRL',
      description: `Plano ${planData.name} - ProxyCDN`,
      customer: {
        name: customerData.name || userData.name || 'Cliente',
        email: customerData.email || userData.email,
        phone: customerData.phone,
        document: customerData.document
      },
      items: [{
        name: `Plano ${planData.name}`,
        quantity: 1,
        unit_amount: Math.round(amount * 100)
      }],
      notification_urls: [
        `${process.env.APP_URL}/api/payments/pagbank/webhook`
      ]
    }

    // Criar pagamento PIX no PagBank
    const payment = await pagBankClient.createPayment(paymentData)

    // Salvar transação no banco de dados
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.user.id,
        plan_id: planId,
        amount: amount,
        currency: 'BRL',
        status: 'pending',
        gateway: 'pagbank',
        gateway_transaction_id: payment.id,
        gateway_response: payment,
        created_at: new Date().toISOString()
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
    const qrCode = payment.qr_codes?.[0]
    const pixData = {
      qr_code: qrCode?.text || '',
      qr_code_image: qrCode?.links?.find((link: any) => link.media === 'image/png')?.href || '',
      payment_id: payment.id,
      transaction_id: transaction.id,
      amount: amount,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    }

    return {
      success: true,
      data: pixData
    }

  } catch (error: any) {
    logger.error('Erro ao criar pagamento PagBank:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})