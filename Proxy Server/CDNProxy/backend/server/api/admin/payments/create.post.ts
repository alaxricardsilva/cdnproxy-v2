import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'
import { generatePixQRCode, validatePixKey } from '../../../../utils/pix-generator'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [PAYMENT CREATE API] Iniciando...')
    
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    logger.info('✅ [PAYMENT CREATE API] Autenticação OK:', user.id)

    // Read request body
    const body = await readBody(event)
    logger.info('📋 [PAYMENT CREATE API] Dados recebidos:', body)

    // Validate required fields
    if ((!body.domain_id && !body.domains) || !body.plan_id || !body.payment_method || !body.amount) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Campos obrigatórios: domain_id ou domains, plan_id, payment_method, amount'
      })
    }

    // Handle both single domain and multiple domains
    const domainIds = body.domains || [body.domain_id]
    
    // Verify domains belong to user
    let domainQuery = supabase
      .from('domains')
      .select('*')
      .in('id', domainIds)

    // Only filter by user_id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      domainQuery = domainQuery.eq('user_id', user.id)
    }

    const { data: domains, error: domainError } = await domainQuery

    if (domainError || !domains || domains.length === 0) {
      logger.error('❌ [PAYMENT CREATE API] Domínios não encontrados:', domainError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínios não encontrados ou não pertencem ao usuário'
      })
    }

    // For backward compatibility, use first domain for single domain operations
    const domain = domains[0]

    // Verify plan exists
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', body.plan_id)
      .single()

    if (planError || !plan) {
      logger.error('❌ [PAYMENT CREATE API] Plano não encontrado:', planError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Plano não encontrado'
      })
    }

    // Create transaction record
    const transactionData = {
      user_id: user.id,
      domain_id: domain.id, // Use first domain for backward compatibility
      amount: body.amount,
      currency: 'BRL',
      type: body.type || 'renewal',
      status: 'pending',
      payment_method: body.payment_method,
      description: domains.length > 1 
        ? `Renovação de ${domains.length} domínios - Plano ${plan.name}`
        : `Renovação do domínio ${domain.domain} - Plano ${plan.name}`,
      metadata: {
        plan_id: body.plan_id,
        plan_name: plan.name,
        domain_ids: domainIds,
        domain_names: domains.map(d => d.domain),
        renewal_count: body.renewal_count || 1,
        duration_value: plan.duration_value,
        duration_type: plan.duration_type,
        domains_count: domains.length
      }
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single()

    if (transactionError) {
      logger.error('❌ [PAYMENT CREATE API] Erro ao criar transação:', transactionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao criar transação'
      })
    }

    logger.info('✅ [PAYMENT CREATE API] Transação criada:', transaction.id)

    // Process payment based on method
    let paymentResponse: any = {}

    switch (body.payment_method) {
      case 'mercadopago':
        paymentResponse = await processMercadoPago(transaction, plan, domain)
        break
      case 'pagbank':
        paymentResponse = await processPagBank(transaction, plan, domain)
        break
      case 'pix':
        paymentResponse = await processPixManual(transaction, plan, domain, supabase, user)
        break
      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Método de pagamento não suportado'
        })
    }

    // Update transaction with payment details
    await supabase
      .from('transactions')
      .update({
        payment_id: paymentResponse.payment_id || null,
        metadata: {
          ...transactionData.metadata,
          ...(paymentResponse.metadata || {}),
          ...(paymentResponse.qr_code ? { qr_code: paymentResponse.qr_code } : {}),
          ...(paymentResponse.pix_code ? { pix_code: paymentResponse.pix_code } : {})
        }
      })
      .eq('id', transaction.id)

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        payment_id: paymentResponse.payment_id || null,
        payment_url: paymentResponse.payment_url || null,
        qr_code: paymentResponse.qr_code || null,
        pix_code: paymentResponse.pix_code || null
      }
    }

  } catch (error: any) {
    logger.error('❌ [PAYMENT CREATE API] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Process Mercado Pago payment
async function processMercadoPago(transaction: any, plan: any, domain: any) {
  // TODO: Implement Mercado Pago integration
  logger.info('🔄 [MERCADO PAGO] Processando pagamento...')
  
  return {
    payment_id: `mp_${transaction.id}_${Date.now()}`,
    payment_url: `https://mercadopago.com/checkout/${transaction.id}`,
    metadata: {
      gateway: 'mercadopago',
      created_at: new Date().toISOString()
    }
  }
}

// Process PagBank payment
async function processPagBank(transaction: any, plan: any, domain: any) {
  // TODO: Implement PagBank integration
  logger.info('🔄 [PAGBANK] Processando pagamento...')
  
  return {
    payment_id: `pb_${transaction.id}_${Date.now()}`,
    payment_url: `https://pagbank.com/checkout/${transaction.id}`,
    metadata: {
      gateway: 'pagbank',
      created_at: new Date().toISOString()
    }
  }
}

// Process PIX Manual payment
async function processPixManual(transaction: any, plan: any, domain: any, supabase: any, user: any) {
  logger.info('🔄 [PIX MANUAL] Processando pagamento...')

  // Buscar configuração PIX Manual do SUPERADMIN
  const { data: pixConfig, error: pixError } = await supabase
    .from('pix_config')
    .select('*')
    .single()

  if (pixError && pixError.code !== 'PGRST116') { // PGRST116 = no rows found
    logger.error('❌ [PIX MANUAL] Erro ao buscar configuração PIX:', pixError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro ao buscar configuração PIX'
    })
  }

  const pixKey = pixConfig?.key || process.env.PIX_KEY
  const pixEnabled = pixConfig?.enabled ?? !!pixKey

  if (!pixEnabled || !pixKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'PIX manual não configurado ou desabilitado'
    })
  }
  
  // Validate PIX key
  const keyValidation = validatePixKey(pixKey)
  if (!keyValidation.valid) {
    throw createError({
      statusCode: 500,
      statusMessage: `Chave PIX inválida configurada: ${pixKey}. Configure uma chave PIX válida.`
    })
  }

  const merchantName = pixConfig?.receiver_name || 'CDNProxy'
  const merchantCity = pixConfig?.city || 'SAO PAULO'
  const pixAmount = Number(transaction.amount)
  const pixDescription = transaction.description || `Renovação de ${transaction.metadata?.domains_count || 1} domínio(s)`

  // Gerar QR Code PIX com formato EMV correto
  const pixQRCode = await generatePixQRCode({
    pixKey,
    amount: pixAmount,
    description: pixDescription,
    transactionId: transaction.id,
    merchantName,
    merchantCity
  })
  
  logger.info('✅ [PIX MANUAL] QR Code PIX gerado:', {
    emvLength: pixQRCode.emvCode.length,
    pixKeyType: pixQRCode.pixKeyType
  })

  return {
    payment_id: `pix_${transaction.id}_${Date.now()}`,
    payment_url: null,
    qr_code: pixQRCode.emvCode,
    pix_code: pixQRCode.emvCode,
    qr_code_image: pixQRCode.qrCodeImage,
    qr_code_base64: pixQRCode.qrCodeBase64,
    metadata: {
      gateway: 'pix_manual',
      created_at: new Date().toISOString(),
      manual_pix: true,
      pix_key: pixKey,
      pix_key_type: pixQRCode.pixKeyType,
      pix_amount: pixAmount,
      pix_description: pixDescription,
      merchant_name: merchantName,
      merchant_city: merchantCity
    }
  }
}