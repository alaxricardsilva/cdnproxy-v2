import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🗑️ [CANCEL TRANSACTION API] Iniciando...')
    
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    logger.info('✅ [CANCEL TRANSACTION API] Autenticação OK:', user.id)

    // Get transaction ID from URL
    const transactionId = getRouterParam(event, 'id')
    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da transação é obrigatório'
      })
    }

    logger.info('📋 [CANCEL TRANSACTION API] Cancelando transação:', transactionId)

    // Get transaction details
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)

    // Only filter by user_id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      query = query.eq('user_id', user.id)
    }

    const { data: transaction, error: transactionError } = await query.single()

    if (transactionError || !transaction) {
      logger.error('❌ [CANCEL TRANSACTION API] Transação não encontrada:', transactionError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Transação não encontrada ou não pertence ao usuário'
      })
    }

    // Check if transaction can be cancelled
    if (transaction.status === 'completed') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Não é possível cancelar uma transação já concluída'
      })
    }

    if (transaction.status === 'cancelled') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Transação já foi cancelada'
      })
    }

    // Update transaction status to cancelled
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
          reason: 'Cancelado pelo usuário'
        }
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ [CANCEL TRANSACTION API] Erro ao cancelar transação:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao cancelar transação'
      })
    }

    logger.info('✅ [CANCEL TRANSACTION API] Transação cancelada:', updatedTransaction.id)

    return {
      success: true,
      message: 'Transação cancelada com sucesso',
      data: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        updated_at: updatedTransaction.updated_at
      }
    }

  } catch (error: any) {
    logger.error('❌ [CANCEL TRANSACTION API] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})