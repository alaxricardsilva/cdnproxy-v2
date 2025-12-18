import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3'
import { requireAdminAuth } from '../../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAIN ANALYTICS API] Iniciando...')
    
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [DOMAIN ANALYTICS API] Autenticação OK:', user.id)

    // Obter ID do domínio da URL
    const domainId = getRouterParam(event, 'id')
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    logger.info('📊 [DOMAIN ANALYTICS API] Domínio ID:', domainId)

    // Verificar se o domínio existe
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          company
        )
      `)
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      logger.error('❌ [DOMAIN ANALYTICS API] Domínio não encontrado:', domainError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    logger.info('✅ [DOMAIN ANALYTICS API] Domínio encontrado:', domain.domain)

    // Retornar dados básicos sem consultar access_logs por enquanto
    const responseData = {
      domain_info: {
        id: domain.id,
        domain: domain.domain,
        target_url: domain.target_url,
        status: domain.status,
        user: {
          id: domain.users.id,
          name: domain.users.name,
          email: domain.users.email
        }
      },
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        period: '7d',
        timezone: 'UTC'
      },
      metrics: {
        total_requests: 0,
        unique_visitors: 0,
        bandwidth_used_gb: 0,
        cache_hit_rate: 0,
        avg_response_time_ms: 0,
        uptime_percentage: 100
      },
      traffic_by_day: [],
      top_pages: [],
      status_codes: {},
      geographic_distribution: {}
    }

    logger.info('✅ [DOMAIN ANALYTICS API] Retornando dados básicos')

    return {
      success: true,
      data: responseData
    }

  } catch (error: any) {
    logger.error('💥 [DOMAIN ANALYTICS API] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})