import { logger } from '../../../utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Usar o sistema de autenticação de admin
    const { user, supabase } = await requireAdminAuth(event, 'ADMIN')

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const search = query.search as string || ''
    const status = query.status as string || ''
    const offset = (page - 1) * limit

    logger.info('📋 [Admin Plans API] Buscando planos:', { 
      page, 
      limit, 
      search, 
      status, 
      adminUser: user.email 
    })

    // Construir query base para buscar planos
    let queryBuilder = supabase
      .from('plans')
      .select('*')

    // Aplicar filtros
    if (search) {
      queryBuilder = queryBuilder.or(`
        name.ilike.%${search}%,
        description.ilike.%${search}%
      `)
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }

    // Buscar planos com paginação
    const { data: plans, error: plansError } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (plansError) {
      logger.error('❌ [Admin Plans API] Erro ao buscar planos:', plansError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro interno do servidor ao buscar planos'
      })
    }

    // Buscar contagem total para paginação
    let countQuery = supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`
        name.ilike.%${search}%,
        description.ilike.%${search}%
      `)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      logger.error('❌ [Admin Plans API] Erro ao contar planos:', countError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro interno do servidor ao contar planos'
      })
    }

    // Para cada plano, buscar quantos usuários têm assinatura ativa
    const plansWithSubscribers = await Promise.all(
      (plans || []).map(async (plan) => {
        const { count: subscribersCount, error: subsError } = await supabase
          .from('user_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id)
          .eq('status', 'active')

        if (subsError) {
          logger.error('❌ [Admin Plans API] Erro ao contar assinantes do plano:', plan.id, subsError)
        }

        return {
          ...plan,
          active_subscribers: subscribersCount || 0
        }
      })
    )

    const totalPages = Math.ceil((count || 0) / limit)

    logger.info('✅ [Admin Plans API] Planos encontrados:', { 
      total: count, 
      returned: plansWithSubscribers.length,
      page,
      totalPages
    })

    return {
      success: true,
      data: {
        plans: plansWithSubscribers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    }

  } catch (error: any) {
    logger.error('❌ [Admin Plans API] Erro geral:', error.message)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})