import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'
import crypto from 'crypto'

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

    const body = await readBody(event)
    const { name, description, expires_in_days } = body

    if (!name || name.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nome da chave é obrigatório'
      })
    }

    // Generate secure API key
    const apiKey = generateApiKey()
    
    // Calculate expiration date if provided
    let expiresAt = null
    if (expires_in_days && expires_in_days > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expires_in_days)
    }

    // Insert new API key
    const { data: newKey, error } = await supabase
      .from('monitoring_api_keys')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        api_key: apiKey,
        is_active: true,
        expires_at: expiresAt?.toISOString() || null,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar chave de API:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao criar chave de API'
      })
    }

    return {
      success: true,
      data: {
        id: newKey.id,
        name: newKey.name,
        description: newKey.description,
        api_key: apiKey, // Only return full key on creation
        is_active: newKey.is_active,
        expires_at: newKey.expires_at,
        created_at: newKey.created_at
      },
      message: 'Chave de API criada com sucesso. Guarde-a em local seguro, pois não será possível visualizá-la novamente.'
    }
  } catch (error: any) {
    logger.error('Erro no endpoint de criação de chave de API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})

function generateApiKey(): string {
  // Generate a secure random API key
  const prefix = 'mk_' // monitoring key prefix
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `${prefix}${randomBytes}`
}