import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, getHeader } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    const planId = getRouterParam(event, 'id')
    if (!planId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do plano é obrigatório'
      })
    }

    // Verificar se o plano existe
    const { data: existingPlan, error: checkError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (checkError || !existingPlan) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Plano não encontrado'
      })
    }

    // Verificar se existem assinantes ativos para este plano
    const { data: activeSubscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('plan_id', planId)
      .eq('status', 'active')

    if (subscriptionError) {
      logger.error('Erro ao verificar assinaturas:', subscriptionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao verificar assinaturas ativas'
      })
    }

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Não é possível excluir o plano. Existem ${activeSubscriptions.length} assinatura(s) ativa(s) para este plano.`
      })
    }

    // Excluir o plano
    const { error: deleteError } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId)

    if (deleteError) {
      logger.error('Erro ao excluir plano:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao excluir plano'
      })
    }

    // Registrar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'PLAN_DELETED',
        resource_type: 'plan',
        resource_id: planId,
        details: {
          plan_id: planId,
          plan_name: existingPlan.name,
          plan_price: existingPlan.price
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      })

    return {
      success: true,
      message: 'Plano excluído com sucesso',
      data: {
        id: planId,
        name: existingPlan.name
      }
    }

  } catch (error) {
    logger.error('Erro ao excluir plano:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Função auxiliar para obter IP do cliente
function getClientIP(event: any): string {
  return getHeader(event, 'x-forwarded-for') || 
         getHeader(event, 'x-real-ip') || 
         getHeader(event, 'cf-connecting-ip') || 
         'unknown'
}