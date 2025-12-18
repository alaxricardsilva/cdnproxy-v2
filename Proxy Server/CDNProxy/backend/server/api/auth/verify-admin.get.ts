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

    // Verify if user is ADMIN or SUPERADMIN (case-insensitive)
    const userRole = userProfile.role?.toUpperCase()
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN'

    if (!isAdmin) {
      return {
        success: false,
        message: 'Usuário não possui permissões de administrador',
        data: {
          isAdmin: false,
          role: userProfile.role || 'user'
        }
      }
    }

    return {
      success: true,
      message: 'Usuário verificado como administrador',
      data: {
        isAdmin: true,
        role: userProfile.role,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role
        }
      }
    }

  } catch (error: any) {
    logger.error('[ERROR] Verify admin error:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})