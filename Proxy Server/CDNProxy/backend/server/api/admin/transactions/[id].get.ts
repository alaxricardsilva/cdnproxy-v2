import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [TRANSACTION DETAIL API] Iniciando...')
    
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    logger.info('✅ [TRANSACTION DETAIL API] Autenticação OK:', user.id)

    // Get transaction ID from URL
    const transactionId = getRouterParam(event, 'id')
    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da transação é obrigatório'
      })
    }

    logger.info('📋 [TRANSACTION DETAIL API] Buscando transação:', transactionId)

    // Get transaction details
    let query = supabase
      .from('transactions')
      .select(`
        *,
        domains(
          id,
          domain,
          status,
          expires_at
        )
      `)
      .eq('id', transactionId)

    // Only filter by user_id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      query = query.eq('user_id', user.id)
    }

    const { data: transaction, error: transactionError } = await query.single()

    if (transactionError || !transaction) {
      logger.error('❌ [TRANSACTION DETAIL API] Transação não encontrada:', transactionError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Transação não encontrada ou não pertence ao usuário'
      })
    }

    logger.info('✅ [TRANSACTION DETAIL API] Transação encontrada:', transaction.id)

    return {
      success: true,
      data: transaction
    }

  } catch (error: any) {
    logger.error('❌ [TRANSACTION DETAIL API] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})