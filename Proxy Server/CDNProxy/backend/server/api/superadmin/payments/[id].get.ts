import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    const paymentId = getRouterParam(event, 'id')
    if (!paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do pagamento é obrigatório'
      })
    }

    // Buscar pagamento específico
    const { data: payment, error: paymentError } = await supabase
      .from('transactions')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          role,
          created_at
        ),
        plans!inner(
          id,
          name,
          description,
          price,
          duration_value,
          duration_type,
          features
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      logger.error('Pagamento não encontrado:', { paymentId, error: paymentError })
      throw createError({
        statusCode: 404,
        statusMessage: `Pagamento com ID '${paymentId}' não foi encontrado no sistema`
      })
    }

    // Formatar dados do pagamento
    const formattedPayment = {
      id: payment.id,
      user: {
        id: payment.users.id,
        name: payment.users.name || payment.users.email,
        email: payment.users.email,
        role: payment.users.role,
        created_at: payment.users.created_at
      },
      plan: {
        id: payment.plans.id,
        name: payment.plans.name,
        description: payment.plans.description,
        price: parseFloat(payment.plans.price),
        duration_value: payment.plans.duration_value,
        duration_type: payment.plans.duration_type,
        features: payment.plans.features
      },
      amount: parseFloat(payment.amount),
      status: payment.status,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      gateway_response: payment.gateway_response,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      expires_at: payment.expires_at,
      metadata: payment.metadata
    }

    return {
      success: true,
      data: formattedPayment
    }

  } catch (error) {
    logger.error('Erro ao buscar pagamento:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})