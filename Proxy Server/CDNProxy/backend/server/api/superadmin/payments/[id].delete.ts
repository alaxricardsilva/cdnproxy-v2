import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, getHeader } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

// Função auxiliar para obter IP do cliente
function getClientIP(event: any): string {
  return getHeader(event, 'x-forwarded-for') || 
         getHeader(event, 'x-real-ip') || 
         getHeader(event, 'cf-connecting-ip') || 
         'unknown'
}

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

    // Verificar se o pagamento existe
    const { data: existingPayment, error: checkError } = await supabase
      .from('transactions')
      .select('id, status, user_id')
      .eq('id', paymentId)
      .single()

    if (checkError || !existingPayment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Pagamento não encontrado'
      })
    }

    // Verificar se o pagamento pode ser cancelado
    if (existingPayment.status === 'COMPLETED') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Não é possível cancelar um pagamento já concluído'
      })
    }

    if (existingPayment.status === 'CANCELLED') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Pagamento já foi cancelado'
      })
    }

    // Atualizar status do pagamento para cancelado
    const { data: updatedPayment, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
        metadata: {
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
          reason: 'Cancelado pelo superadmin'
        }
      })
      .eq('id', paymentId)
      .select()
      .single()

    if (updateError) {
      logger.error('Erro ao cancelar pagamento:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao cancelar pagamento'
      })
    }

    // Registrar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'PAYMENT_CANCELLED',
        resource_type: 'transaction',
        resource_id: paymentId,
        details: {
          payment_id: paymentId,
          affected_user_id: existingPayment.user_id,
          previous_status: existingPayment.status,
          new_status: 'CANCELLED'
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      })

    return {
      success: true,
      message: 'Pagamento cancelado com sucesso',
      data: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        updated_at: updatedPayment.updated_at
      }
    }

  } catch (error) {
    logger.error('Erro ao cancelar pagamento:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})