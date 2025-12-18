import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { verifyJWT } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const transactionId = getRouterParam(event, 'transactionId')
    
    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da transação é obrigatório'
      })
    }

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

    // Conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar transação
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        plans!inner(
          id,
          name,
          description,
          price,
          duration_value,
          duration_type
        )
      `)
      .eq('id', transactionId)
      .eq('user_id', payload.userId)
      .single()

    if (transactionError || !transaction) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Transação não encontrada'
      })
    }

    return {
      success: true,
      data: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        billing_cycle: transaction.billing_cycle,
        payment_method: transaction.payment_method,
        external_id: transaction.external_id,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        plan: transaction.plans,
        pix_qr_code: transaction.pix_qr_code,
        pix_qr_code_text: transaction.pix_qr_code_text
      }
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})