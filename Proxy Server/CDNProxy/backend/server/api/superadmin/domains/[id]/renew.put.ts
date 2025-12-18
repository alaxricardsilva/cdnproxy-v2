import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireAdminAuth } from '../../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAIN RENEW API] Iniciando...')
    
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [DOMAIN RENEW API] Autenticação OK:', user.id)

    // Obter ID do domínio da URL
    const domainId = getRouterParam(event, 'id')
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    // Ler dados do corpo da requisição (opcional)
    let body = {}
    try {
      body = await readBody(event) || {}
    } catch (error) {
      body = {}
    }
    logger.info('📋 [DOMAIN RENEW API] Dados recebidos:', { domainId, body })

    // Verificar se o domínio existe
    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          company
        ),
        plans(
          id,
          name,
          description,
          max_domains,
          max_bandwidth_gb,
          price,
          duration_value,
          duration_type
        )
      `)
      .eq('id', domainId)
      .single()

    if (checkError || !existingDomain) {
      logger.error('❌ [DOMAIN RENEW API] Domínio não encontrado:', checkError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    // Calcular nova data de expiração
    let newExpiresAt: string
    const currentDate = new Date()
    
    if (body && typeof body === 'object' && 'duration_months' in body && typeof (body as any).duration_months === 'number') {
      // Usar duração personalizada se fornecida
      const renewalDate = new Date(currentDate)
      renewalDate.setMonth(renewalDate.getMonth() + (body as any).duration_months)
      newExpiresAt = renewalDate.toISOString()
    } else if (existingDomain.plans && existingDomain.plans.duration_value && existingDomain.plans.duration_type) {
      // Usar duração do plano
      const renewalDate = new Date(currentDate)
      const durationValue = existingDomain.plans.duration_value
      const durationType = existingDomain.plans.duration_type
      
      switch (durationType) {
        case 'month':
        case 'months':
          renewalDate.setMonth(renewalDate.getMonth() + durationValue)
          break
        case 'year':
        case 'years':
          renewalDate.setFullYear(renewalDate.getFullYear() + durationValue)
          break
        case 'day':
        case 'days':
          renewalDate.setDate(renewalDate.getDate() + durationValue)
          break
        default:
          // Padrão: 1 mês
          renewalDate.setMonth(renewalDate.getMonth() + 1)
      }
      
      newExpiresAt = renewalDate.toISOString()
    } else {
      // Padrão: renovar por 1 mês
      const renewalDate = new Date(currentDate)
      renewalDate.setMonth(renewalDate.getMonth() + 1)
      newExpiresAt = renewalDate.toISOString()
    }

    logger.info('🔄 [DOMAIN RENEW API] Renovando domínio:', {
      domain: existingDomain.domain,
      currentExpiry: existingDomain.expires_at,
      newExpiry: newExpiresAt
    })

    // Atualizar domínio com nova data de expiração
    const { data: renewedDomain, error: updateError } = await supabase
      .from('domains')
      .update({
        expires_at: newExpiresAt,
        status: 'active', // Reativar se estava expirado
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          company
        ),
        plans(
          id,
          name,
          description,
          max_domains,
          max_bandwidth_gb,
          price,
          duration_value,
          duration_type
        )
      `)
      .single()

    if (updateError) {
      logger.error('❌ [DOMAIN RENEW API] Erro ao renovar domínio:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao renovar domínio: ${updateError.message}`
      })
    }

    logger.info('✅ [DOMAIN RENEW API] Domínio renovado com sucesso:', renewedDomain.id)

    return {
      success: true,
      data: renewedDomain,
      message: 'Domínio renovado com sucesso',
      renewal_info: {
        previous_expiry: existingDomain.expires_at,
        new_expiry: newExpiresAt,
        renewed_at: new Date().toISOString()
      }
    }

  } catch (error: any) {
    logger.error('💥 [DOMAIN RENEW API] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})