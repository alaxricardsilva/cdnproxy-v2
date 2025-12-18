import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAINS API] Iniciando...')
    
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [DOMAINS API] Autenticação OK:', user.id)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || ''
    const status = query.status as string || ''
    const userId = query.user_id as string || ''
    
    logger.info('📋 [DOMAINS API] Parâmetros:', { page, limit, search, status, userId })

    // Build domains query with user and plan information
    logger.info('🔨 [DOMAINS API] Construindo query...')
    let domainsQuery = supabase
      .from('domains')
      .select(`
        *,
        users(
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

    // Apply filters
    if (search) {
      logger.info('🔍 [DOMAINS API] Aplicando filtro de busca:', search)
      domainsQuery = domainsQuery.or(`domain.ilike.%${search}%,users.email.ilike.%${search}%,users.name.ilike.%${search}%`)
    }

    if (status) {
      logger.info('📊 [DOMAINS API] Aplicando filtro de status:', status)
      domainsQuery = domainsQuery.eq('status', status)
    }

    if (userId) {
      logger.info('👤 [DOMAINS API] Aplicando filtro de usuário:', userId)
      domainsQuery = domainsQuery.eq('user_id', userId)
    }

    // Get total count for pagination
    logger.info('📊 [DOMAINS API] Buscando contagem total...')
    const { count, error: countError } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      
    if (countError) {
      logger.error('❌ [DOMAINS API] Erro na contagem:', countError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro na contagem: ${countError.message}`
      })
    }
    
    logger.info('✅ [DOMAINS API] Contagem total:', count)

    // Apply pagination and ordering
    logger.info('📄 [DOMAINS API] Executando query principal...')
    const { data: domains, error } = await domainsQuery
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('❌ [DOMAINS API] Erro na query principal:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro na query: ${error.message}`
      })
    }
    
    logger.info('✅ [DOMAINS API] Query principal executada, resultados:', domains?.length || 0)

    // Get statistics
    logger.info('📈 [DOMAINS API] Buscando estatísticas...')
    const { data: stats, error: statsError } = await supabase
      .from('domains')
      .select('status')
      
    if (statsError) {
      logger.error('⚠️ [DOMAINS API] Erro nas estatísticas:', statsError)
    }

    const statistics = {
      total: count || 0,
      active: stats?.filter(d => d.status === 'active').length || 0,
      pending: stats?.filter(d => d.status === 'pending').length || 0,
      suspended: stats?.filter(d => d.status === 'suspended').length || 0,
      expired: stats?.filter(d => d.status === 'expired').length || 0
    }
    
    logger.info('✅ [DOMAINS API] Estatísticas:', statistics)

    const result = {
      success: true,
      data: {
        domains: domains || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        statistics
      }
    }
    
    logger.info('🎉 [DOMAINS API] Sucesso! Retornando dados...')
    return result

  } catch (error: any) {
    logger.error('💥 [DOMAINS API] Erro geral:', error)
    logger.error('📍 [DOMAINS API] Stack trace:', error.stack)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})