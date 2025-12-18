import { logger } from '../../../utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    const domainId = getRouterParam(event, 'id')
    
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    // Fetch domain with plan information
    const { data: domain, error } = await supabase
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
      `)
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (error || !domain) {
      logger.error('Domain not found:', { domainId, userId: user.id, errorMessage: error?.message })
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    // Check if domain is expired
    const now = new Date()
    const expiresAt = domain.expires_at ? new Date(domain.expires_at) : null
    const isExpired = expiresAt && expiresAt < now
    const isActive = domain.status === 'active' && !isExpired

    return {
      success: true,
      data: {
        ...domain,
        isActive,
        isExpired,
        expiresAt: domain.expires_at,
        lastUpdated: domain.updated_at,
        createdAt: domain.created_at
      }
    }

  } catch (error: any) {
    logger.error('Error fetching domain:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})