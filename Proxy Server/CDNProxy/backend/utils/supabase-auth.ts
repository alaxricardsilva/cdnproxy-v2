import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { getCookie, getHeader, createError } from 'h3'

export interface AuthUser {
  id: string
  email: string
  role: string
  user_metadata?: any
}

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

export async function validateSupabaseAuth(event: any): Promise<AuthUser> {
  // Create Supabase client using environment variables directly
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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

  // Validate token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    logger.error('Supabase token validation failed:', new Error(error?.message || 'Unknown error'))
    throw createError({
      statusCode: 401,
      statusMessage: 'Token inválido'
    })
  }

  // Get user role from database (more reliable than user_metadata)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    logger.error('User not found in database:', new Error(userError?.message || 'Unknown error'))
    throw createError({
      statusCode: 401,
      statusMessage: 'Usuário não encontrado no banco de dados'
    })
  }

  return {
    id: user.id,
    email: user.email || '',
    role: userData.role, // Use role from database, not from user_metadata
    user_metadata: user.user_metadata
  }
}

export async function requireSuperAdmin(event: any): Promise<AuthUser> {
  const user = await validateSupabaseAuth(event)
  
  if (user.role?.toUpperCase() !== 'SUPERADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso negado. Apenas superadmins podem acessar este recurso.'
    })
  }
  
  return user
}

export async function requireAdmin(event: any): Promise<AuthUser> {
  const user = await validateSupabaseAuth(event)
  
  const allowedRoles = ['ADMIN', 'SUPERADMIN']
  if (!allowedRoles.includes(user.role?.toUpperCase())) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso negado. Apenas administradores podem acessar este recurso.'
    })
  }
  
  return user
}