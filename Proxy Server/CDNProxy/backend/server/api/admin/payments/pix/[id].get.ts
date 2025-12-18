import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [PIX DETAIL API] Iniciando...')
    
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    logger.info('✅ [PIX DETAIL API] Autenticação OK:', user.id)

    // Get transaction ID from URL
    const transactionId = getRouterParam(event, 'id')
    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da transação é obrigatório'
      })
    }

    logger.info('📋 [PIX DETAIL API] Buscando transação PIX:', transactionId)

    // Get transaction details
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('payment_method', 'pix')

    // Only filter by user_id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      query = query.eq('user_id', user.id)
    }

    const { data: transaction, error: transactionError } = await query.single()

    if (transactionError || !transaction) {
      logger.error('❌ [PIX DETAIL API] Transação não encontrada:', transactionError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Parece que esse código não existe.'
      })
    }

    // Verificar se a transação tem dados PIX no metadata
    const metadata = transaction.metadata || {}
    
    if (!metadata.qr_code && !metadata.pix_code) {
      logger.error('❌ [PIX DETAIL API] QR Code não encontrado no metadata')
      throw createError({
        statusCode: 404,
        statusMessage: 'Código PIX não encontrado para esta transação'
      })
    }

    logger.info('✅ [PIX DETAIL API] Transação PIX encontrada:', {
      id: transaction.id,
      status: transaction.status,
      hasQRCode: !!metadata.qr_code,
      hasPixCode: !!metadata.pix_code
    })

    // Verificar se o pagamento expirou (30 minutos)
    const createdAt = new Date(transaction.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
    const isExpired = diffMinutes > 30 && transaction.status === 'pending'

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        pix_key: metadata.pix_key || null,
        pix_key_type: metadata.pix_key_type || null,
        pix_code: metadata.pix_code || metadata.qr_code || null,
        qr_code: metadata.qr_code || metadata.pix_code || null,
        qr_code_image: metadata.qr_code_image || null,
        qr_code_base64: metadata.qr_code_base64 || null,
        domains: metadata.domains || [],
        plan_name: metadata.plan_name || null,
        created_at: transaction.created_at,
        expires_at: new Date(createdAt.getTime() + 30 * 60 * 1000).toISOString(),
        is_expired: isExpired
      }
    }

  } catch (error: any) {
    logger.error('❌ [PIX DETAIL API] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})
