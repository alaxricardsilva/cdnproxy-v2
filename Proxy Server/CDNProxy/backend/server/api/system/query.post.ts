import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, readBody, getHeader } from 'h3'

// Função auxiliar para obter IP do cliente
function getClientIP(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  const realIP = getHeader(event, 'x-real-ip')
  const clientIP = getHeader(event, 'x-client-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || clientIP || event.node?.req?.connection?.remoteAddress || '127.0.0.1'
}

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

    // Get request body
    const body = await readBody(event)
    const { query } = body

    if (!query || typeof query !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query SQL é obrigatória'
      })
    }

    // Get user from headers
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Verify JWT token and check superadmin role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Check if user has superadmin privileges
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    if (!userProfile || userProfile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Apenas superadmins podem executar queries SQL'
      })
    }

    // Validate query (basic security checks)
    const normalizedQuery = query.toLowerCase().trim()
    
    // Block dangerous operations
    const dangerousOperations = [
      'drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update'
    ]
    
    const isDangerous = dangerousOperations.some(op => 
      normalizedQuery.includes(op + ' ') || normalizedQuery.startsWith(op)
    )

    if (isDangerous) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Operações de modificação não são permitidas por segurança'
      })
    }

    // Execute query (only SELECT operations)
    try {
      const { data, error, count } = await supabase.rpc('execute_sql', {
        sql_query: query
      })

      if (error) {
        throw error
      }

      // Log the query execution - verificar se user.id é UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(user.id)) {
        await supabase
          .from('access_logs')
          .insert({
            user_id: user.id,
            action: 'sql_query',
            details: JSON.stringify({
              query: query.substring(0, 500), // Limit query length in logs
              result_count: count || (data ? data.length : 0)
            }),
            ip_address: getClientIP(event) || '127.0.0.1',
            user_agent: getHeader(event, 'user-agent') || 'unknown',
            created_at: new Date().toISOString()
          })
      } else {
        logger.info('⚠️ [query.post] user.id não é UUID válido, pulando log de auditoria')
      }

      return {
        success: true,
        data: data || [],
        count: count || (data ? data.length : 0),
        query: query,
        executed_at: new Date().toISOString()
      }

    } catch (queryError: any) {
      // Log failed query - verificar se user.id é UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(user.id)) {
        await supabase
          .from('access_logs')
          .insert({
            user_id: user.id,
            action: 'sql_query_failed',
            details: JSON.stringify({
              query: query.substring(0, 500),
              error: queryError.message
            }),
            ip_address: getClientIP(event) || '127.0.0.1',
            user_agent: getHeader(event, 'user-agent') || 'unknown',
            created_at: new Date().toISOString()
          })
      } else {
        logger.info('⚠️ [query.post] user.id não é UUID válido, pulando log de auditoria')
      }

      throw createError({
        statusCode: 400,
        statusMessage: `Erro na query: ${queryError.message}`
      })
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