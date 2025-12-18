import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

// Helper function to parse cookies
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}
  
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })
  return cookies
}

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get token from Authorization header, X-Supabase-Token header, or cookie
    let token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!token) {
      token = getHeader(event, 'x-supabase-token')
    }
    if (!token) {
      const cookies = parseCookies(getHeader(event, 'cookie'))
      token = cookies['auth-token'] || cookies['sb-access-token']
    }
    
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de acesso requerido'
      })
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Perfil do usuário não encontrado'
      })
    }

    if (userProfile.status?.toLowerCase() !== 'active') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Conta inativa'
      })
    }

    // Verify if user is SUPERADMIN (case-insensitive)
    if (userProfile.role?.toUpperCase() !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado - apenas superadmin'
      })
    }

    // Return success response
    return {
      success: true,
      message: 'Usuário verificado como superadmin',
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role
      }
    }

  } catch (error: any) {
    logger.error('Erro no endpoint auth/verify-superadmin:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})