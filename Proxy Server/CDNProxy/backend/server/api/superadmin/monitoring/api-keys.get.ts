import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    
    // Check if user has superadmin privileges
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    if (!profile || profile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      })
    }

    // Get all monitoring API keys
    const { data: apiKeys, error } = await supabase
      .from('monitoring_api_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Erro ao buscar chaves de API:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar chaves de API'
      })
    }

    // Remove sensitive data from response
    const sanitizedKeys = apiKeys?.map(key => ({
      id: key.id,
      name: key.name,
      description: key.description,
      key_preview: key.api_key ? `${key.api_key.substring(0, 8)}...${key.api_key.substring(-4)}` : null,
      is_active: key.is_active,
      last_used_at: key.last_used_at,
      created_at: key.created_at,
      expires_at: key.expires_at
    })) || []

    return {
      success: true,
      data: sanitizedKeys
    }
  } catch (error: any) {
    logger.error('Erro no endpoint de chaves de API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})