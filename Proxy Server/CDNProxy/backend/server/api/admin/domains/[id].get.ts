import { defineEventHandler, createError, getRouterParam } from 'h3'
import { logger } from '../../../../utils/logger'
import { requireAdminAuth, supabaseAdmin } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [ADMIN DOMAIN BY ID API] Iniciando...')
    
    // Verificar autenticação de administrador
    const { user, userProfile, supabase } = await requireAdminAuth(event)
    logger.info('✅ [ADMIN DOMAIN BY ID API] Autenticação OK:', user.id)

    // Obter ID do domínio da URL
    const domainId = getRouterParam(event, 'id')
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    // Buscar o domínio específico que pertence ao usuário logado
    // Verificar se user.id é um UUID válido antes de fazer a query
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let domainQuery = supabaseAdmin
      .from('domains')
      .select(`
        id,
        domain,
        target_url,
        redirect_301,
        status,
        ssl_enabled,
        cache_enabled,
        created_at,
        updated_at,
        expires_at,
        user_id
      `)
      .eq('id', domainId)

    // Se é admin local, buscar qualquer domínio; se é admin do Supabase, filtrar por user_id
    if (user.id !== 'admin' && uuidRegex.test(user.id)) {
      domainQuery = domainQuery.eq('user_id', user.id)
    }

    const { data: domain, error: domainError } = await domainQuery.single()

    if (domainError || !domain) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado ou não pertence ao usuário'
      })
    }

    return {
      success: true,
      data: domain
    }

  } catch (error: any) {
    logger.error('Erro na API admin/domains/[id]:', error)
    
    // Se já é um erro HTTP, re-lançar
    if (error.statusCode) {
      throw error
    }
    
    // Erro genérico
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})