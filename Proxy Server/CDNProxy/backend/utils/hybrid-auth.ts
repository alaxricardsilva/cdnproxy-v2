import { logger } from './logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, getHeader } from 'h3'
import * as jwt from 'jsonwebtoken'

// Add this helper function after the imports
function parseCookies(event: any) {
  const cookieHeader = getHeader(event, 'cookie')
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

// Verificar variáveis de ambiente obrigatórias diretamente
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const jwtSecret = process.env.JWT_SECRET

logger.info('🔧 [HYBRID-AUTH] Carregando variáveis de ambiente...', { 
  supabaseUrl: !!supabaseUrl,
  supabaseServiceKey: !!supabaseServiceKey,
  supabaseAnonKey: !!supabaseAnonKey,
  jwtSecret: !!jwtSecret
})
logger.info('📋 [HYBRID-AUTH] JWT Secret length:', { length: jwtSecret?.length })

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  logger.error('❌ [HYBRID-AUTH] Variáveis de ambiente do Supabase faltando:', new Error('Configuração do Supabase incompleta'))
  logger.error('supabaseUrl:', new Error(String(!!supabaseUrl)))
  logger.error('supabaseServiceKey:', new Error(String(!!supabaseServiceKey)))
  logger.error('supabaseAnonKey:', new Error(String(!!supabaseAnonKey)))
  throw new Error('Configuração do Supabase incompleta')
}

if (!jwtSecret) {
  logger.error('❌ [HYBRID-AUTH] JWT_SECRET não definido', new Error('JWT_SECRET é obrigatório'))
  throw new Error('JWT_SECRET é obrigatório')
}

// Cliente com Service Role (para operações administrativas)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
)

// Cliente anônimo (para operações com JWT de usuário)
export const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
)

/**
 * Middleware para APIs de usuário autenticado
 * Usa decodificação manual do JWT e validação no banco
 */
export async function requireUserAuth(event: any) {
  try {
    logger.info('🔍 [requireUserAuth] Iniciando validação...')
    
    // Get token from Authorization header, X-Supabase-Token header, or cookie
    let token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!token) {
      token = getHeader(event, 'x-supabase-token')
    }
    if (!token) {
      const cookies = parseCookies(event)
      token = cookies['auth-token'] || cookies['sb-access-token']
    }
    
    logger.info('📋 [requireUserAuth] Token extraído, tamanho:', { length: token?.length })
    
    if (!token) {
      logger.info('❌ [requireUserAuth] Token de autenticação necessário')
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }
    
    // Primeiro tentar verificar com Supabase (método mais confiável)
    try {
      logger.info('🔍 [requireUserAuth] Tentando validar com Supabase...')
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (error || !user) {
        logger.info('❌ [requireUserAuth] Token inválido via Supabase:', { error: error?.message })
      } else {
        logger.info('✅ [requireUserAuth] Token válido via Supabase:', { userId: user.id, email: user.email })
        
        // Buscar dados completos do usuário no banco
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (userError || !userData) {
          logger.info('❌ [requireUserAuth] Usuário não encontrado no banco:', { userId: user.id })
          throw createError({
            statusCode: 401,
            statusMessage: 'Usuário não encontrado'
          })
        }
        
        // Criar objeto user compatível
        const userProfile = {
          id: userData.id,
          email: userData.email,
          role: userData.role, // Usar o role do banco de dados
          user_metadata: {
            name: userData.name,
            role: userData.role
          }
        }
        
        logger.info('✅ [requireUserAuth] Usuário autenticado:', { email: userData.email, role: userData.role })
        return { user: userProfile, userProfile: userData, supabase: supabaseAdmin }
      }
    } catch (supabaseError: any) {
      logger.info('📋 [requireUserAuth] Erro na validação Supabase:', { error: supabaseError.message })
    }
    
    // Se não é válido com Supabase, tentar verificar como JWT local
    try {
      logger.info('🔍 [requireUserAuth] Tentando validar como JWT local...')
      const decoded = jwt.verify(token, jwtSecret!) as any
      logger.info('✅ [requireUserAuth] JWT local válido:', { decoded })
      
      // Se é um token JWT local, buscar usuário no banco
      if (decoded.userId || decoded.sub) {
        const userId = decoded.userId || decoded.sub
        logger.info('🔍 [requireUserAuth] Buscando usuário no banco:', { userId })
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (userError) {
          logger.info('❌ [requireUserAuth] Erro ao buscar usuário:', { error: userError.message })
        } else if (!userData) {
          logger.info('❌ [requireUserAuth] Usuário não encontrado no banco')
        } else {
          logger.info('✅ [requireUserAuth] Usuário encontrado via JWT local:', { email: userData.email, role: userData.role })
          return {
            user: {
              id: userData.id,
              email: userData.email,
              role: userData.role,
              user_metadata: {
                name: userData.name,
                role: userData.role
              }
            },
            userProfile: userData,
            supabase: supabaseAdmin
          }
        }
      } else {
        logger.info('❌ [requireUserAuth] JWT local não contém ID do usuário (nem userId nem sub)')
      }
    } catch (jwtError: any) {
      logger.info('📋 [requireUserAuth] Erro na validação JWT local:', { error: jwtError.message })
    }
    
    // Se nenhum método funcionou, token é inválido
    logger.info('❌ [requireUserAuth] Token inválido ou expirado')
    throw createError({
      statusCode: 401,
      statusMessage: 'Token inválido ou expirado'
    })
    
  } catch (error: any) {
    logger.error('❌ [requireUserAuth] Erro:', error instanceof Error ? error : new Error(String(error)))
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 401,
      statusMessage: 'Falha na autenticação'
    })
  }
}

/**
 * Middleware para APIs administrativas
 * Usa Service Role Key com validação de role
 */
export async function requireAdminAuth(event: any, requiredRole: 'ADMIN' | 'SUPERADMIN' = 'ADMIN') {
  try {
    logger.info('🔍 [requireAdminAuth] Iniciando validação admin...')
    logger.info('📋 [requireAdminAuth] JWT_SECRET disponível:', { available: !!jwtSecret })
    logger.info('📋 [requireAdminAuth] JWT_SECRET length:', { length: jwtSecret?.length })
    
    // Get token from Authorization header, X-Supabase-Token header, or cookie
    let token = getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!token) {
      token = getHeader(event, 'x-supabase-token')
    }
    if (!token) {
      const cookies = parseCookies(event)
      token = cookies['auth-token'] || cookies['sb-access-token']
    }
    
    if (!token) {
      logger.error('❌ [requireAdminAuth] Token de autenticação necessário - nenhum token encontrado')
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    logger.info('📋 [requireAdminAuth] Token extraído, tamanho:', { length: token.length })
    logger.info('📋 [requireAdminAuth] Token início:', { tokenStart: token.substring(0, 50) })
    
    // Primeiro tentar verificar com Supabase (método mais confiável)
    try {
      logger.info('🔍 [requireAdminAuth] Tentando validar com Supabase...')
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (error || !user) {
        logger.info('❌ [requireAdminAuth] Token inválido via Supabase:', { error: error?.message })
      } else {
        logger.info('✅ [requireAdminAuth] Token válido via Supabase:', { userId: user.id, email: user.email })
        
        // Verificar se user.id é um UUID válido antes de fazer a query
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(user.id)) {
          logger.info('❌ [requireAdminAuth] user.id não é um UUID válido:', { userId: user.id })
          throw createError({
            statusCode: 401,
            statusMessage: 'ID de usuário inválido'
          })
        }
        
        // Buscar usuário no banco usando Service Role
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (userError || !userData) {
          logger.info('❌ [requireAdminAuth] Usuário não encontrado:', { userId: user.id, error: userError?.message })
          throw createError({
            statusCode: 401,
            statusMessage: 'Usuário não encontrado'
          })
        }

        // Verificar role (case-insensitive)
        const userRole = (userData.role || '').toUpperCase()
        const requiredRoleUpper = requiredRole.toUpperCase()
        const allowedRoles = requiredRoleUpper === 'SUPERADMIN' ? ['SUPERADMIN'] : ['ADMIN', 'SUPERADMIN']
        
        if (!allowedRoles.includes(userRole)) {
          logger.info('❌ [requireAdminAuth] Role insuficiente:', { userRole: userData.role, requiredRole })
          throw createError({
            statusCode: 403,
            statusMessage: `Acesso negado - role necessária: ${requiredRole}`
          })
        }

        logger.info('✅ [requireAdminAuth] Admin autenticado:', { email: userData.email, role: userData.role })
        return {
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role
          },
          userProfile: userData,
          supabase: supabaseAdmin
        }
      }
    } catch (supabaseError: any) {
      logger.info('📋 [requireAdminAuth] Erro na validação Supabase:', { error: supabaseError.message })
    }
    
    // Se não é válido com Supabase, tentar verificar como JWT local
    try {
      logger.info('🔍 [requireAdminAuth] Tentando validar JWT local com secret...')
      logger.info('📋 [requireAdminAuth] Usando JWT_SECRET:', { secretLength: jwtSecret?.length })
      const decoded = jwt.verify(token, jwtSecret!) as any
      logger.info('✅ [requireAdminAuth] JWT local válido:', { decoded })
      
      // Se é um token JWT local com role admin, permitir acesso
      if (decoded.role === 'admin' && decoded.userId === 'admin') {
        logger.info('✅ [requireAdminAuth] Admin local autenticado')
        return {
          user: {
            id: 'admin',
            email: 'admin@local',
            name: 'Admin Local',
            role: 'ADMIN'
          },
          userProfile: {
            id: 'admin',
            email: 'admin@local',
            name: 'Admin Local',
            role: 'ADMIN'
          },
          supabase: supabaseAdmin
        }
      }
      
      // Se é um token JWT local com userId, buscar usuário no banco
      if (decoded.userId) {
        logger.info('🔍 [requireAdminAuth] Buscando usuário JWT local no banco:', { userId: decoded.userId })
        
        // Buscar usuário no banco usando Service Role
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', decoded.userId)
          .single()
        
        if (userError || !userData) {
          logger.info('❌ [requireAdminAuth] Usuário JWT local não encontrado:', { userId: decoded.userId, error: userError?.message })
        } else {
          // Verificar role (case-insensitive)
          const userRole = (userData.role || '').toUpperCase()
          const requiredRoleUpper = requiredRole.toUpperCase()
          const allowedRoles = requiredRoleUpper === 'SUPERADMIN' ? ['SUPERADMIN'] : ['ADMIN', 'SUPERADMIN']
          
          if (!allowedRoles.includes(userRole)) {
            logger.info('❌ [requireAdminAuth] Role insuficiente para usuário JWT local:', { userRole: userData.role, requiredRole })
            throw createError({
              statusCode: 403,
              statusMessage: `Acesso negado - role necessária: ${requiredRole}`
            })
          }
          
          logger.info('✅ [requireAdminAuth] Admin autenticado via JWT local:', { email: userData.email, role: userData.role })
          return {
            user: {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role
            },
            userProfile: userData,
            supabase: supabaseAdmin
          }
        }
      } else {
        logger.info('⚠️ [requireAdminAuth] JWT local válido mas não é admin local - tentando Supabase:', { role: decoded.role, userId: decoded.userId })
      }
    } catch (jwtError: any) {
      logger.info('📋 [requireAdminAuth] Erro na validação JWT local:', { error: jwtError.message })
    }
    
    // Se nenhum método funcionou, token é inválido
    logger.info('❌ [requireAdminAuth] Token inválido ou expirado')
    throw createError({
      statusCode: 401,
      statusMessage: 'Token inválido ou expirado'
    })
    
  } catch (error: any) {
    logger.error('❌ [requireAdminAuth] Erro na autenticação admin:', error instanceof Error ? error : new Error(String(error)))
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 401,
      statusMessage: 'Falha na autenticação administrativa'
    })
  }
}

/**
 * Middleware para APIs de sistema (sem autenticação de usuário)
 * Usa apenas Service Role Key
 */
export function getSystemClient() {
  return supabaseAdmin
}

/**
 * Utilitário para determinar qual tipo de autenticação usar
 */
export function getAuthType(endpoint: string): 'user' | 'admin' | 'system' {
  if (endpoint.includes('/superadmin/')) return 'admin'
  if (endpoint.includes('/admin/')) return 'admin'
  if (endpoint.includes('/system/')) return 'system'
  return 'user'
}