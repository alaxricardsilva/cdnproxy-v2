import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const search = query.search as string || ''

    // Build query for domains with plan information
    let domainsQuery = supabase
      .from('domains')
      .select(`
        *,
        plans!inner(
          id,
          name,
          description,
          max_domains,
          max_bandwidth_gb,
          monthly_price,
          duration_value,
          duration_type,
          features
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)

    // Add search filter if provided
    if (search) {
      domainsQuery = domainsQuery.ilike('domain', `%${search}%`)
    }

    // Add pagination
    const offset = (page - 1) * limit
    domainsQuery = domainsQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    const { data: domains, error, count } = await domainsQuery

    if (error) {
      logger.error('Supabase error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar domínios'
      })
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)

    return {
      success: true,
      data: domains,
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