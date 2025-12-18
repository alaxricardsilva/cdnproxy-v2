import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [domains.get] Iniciando busca de domínios...')
    
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    logger.info('✅ [domains.get] Autenticação bem-sucedida, user:', user)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || ''
    const status = query.status as string || ''

    logger.info('📋 [domains.get] Parâmetros:', { page, limit, search, status })

    // Build query for domains
    let domainsQuery = supabase
      .from('domains')
      .select('*', { count: 'exact' })

    // Se é admin local, buscar todos os domínios; se é admin do Supabase, filtrar por user_id
    if (user.id !== 'admin') {
      logger.info('🔍 [domains.get] Filtrando por user_id:', user.id)
      // Verificar se user.id é um UUID válido antes de fazer a query
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(user.id)) {
        domainsQuery = domainsQuery.eq('user_id', user.id)
      } else {
        logger.info('⚠️ [domains.get] user.id não é UUID válido, buscando todos os domínios')
      }
    } else {
      logger.info('🔍 [domains.get] Admin local - buscando todos os domínios')
    }

    // Add search filter if provided
    if (search) {
      domainsQuery = domainsQuery.or(`domain.ilike.%${search}%,target_url.ilike.%${search}%`)
    }

    // Add status filter if provided
    if (status) {
      domainsQuery = domainsQuery.eq('status', status)
    }

    // Add pagination
    const offset = (page - 1) * limit
    domainsQuery = domainsQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    logger.info('🔍 [domains.get] Executando query...')
    const { data: domains, error, count } = await domainsQuery

    logger.info('📊 [domains.get] Resultado da query:', { 
      domainsCount: domains?.length || 0, 
      totalCount: count, 
      error: error?.message || 'nenhum erro' 
    })

    if (error) {
      logger.error('❌ [domains.get] Supabase error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar domínios'
      })
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)

    return {
      success: true,
      data: domains || [],
      total: count || 0,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
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