import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

    // Verificar se é uma requisição POST
    if (event.node.req.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Método não permitido'
      })
    }

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    const { days = 30 } = body || {}

    // Verificar autenticação SUPERADMIN
    const authHeader = event.node.req.headers.authorization
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    // Configurar cliente Supabase
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Verificar token JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Verificar se o usuário é SUPERADMIN
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    if (!profile || profile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado - apenas SUPERADMIN'
      })
    }

    // Calcular data limite para limpeza
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffISOString = cutoffDate.toISOString()

    const cleanupResults = {
      access_logs_deleted: 0,
      analytics_deleted: 0,
      old_sessions_deleted: 0,
      total_deleted: 0,
      cleanup_date: cutoffISOString
    }

    // Limpar logs de acesso antigos
    try {
      const { count: accessLogsCount } = await supabase
        .from('access_logs')
        .delete()
        .lt('created_at', cutoffISOString)
        .select('*', { count: 'exact', head: true })

      cleanupResults.access_logs_deleted = accessLogsCount || 0
    } catch (error) {
      console.warn('Erro ao limpar access_logs:', error)
    }

    // Limpar dados de analytics antigos (opcional)
    try {
      const { count: analyticsCount } = await supabase
        .from('analytics')
        .delete()
        .lt('created_at', cutoffISOString)
        .select('*', { count: 'exact', head: true })

      cleanupResults.analytics_deleted = analyticsCount || 0
    } catch (error) {
      console.warn('Erro ao limpar analytics:', error)
    }

    // Calcular total deletado
    cleanupResults.total_deleted = 
      cleanupResults.access_logs_deleted + 
      cleanupResults.analytics_deleted + 
      cleanupResults.old_sessions_deleted

    // Log da operação de limpeza - verificar se user.id é UUID válido
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(user.id)) {
        await supabase
          .from('access_logs')
          .insert({
            user_id: user.id,
            action: 'cleanup_logs',
            details: JSON.stringify(cleanupResults),
            ip_address: '127.0.0.1',
            user_agent: event.node.req.headers['user-agent'] || 'system',
            created_at: new Date().toISOString()
          })
      } else {
        logger.info('⚠️ [cleanup-logs.post] user.id não é UUID válido, pulando log de auditoria')
      }
    } catch (error) {
      console.warn('Erro ao registrar log de limpeza:', error)
    }

    return {
      success: true,
      data: cleanupResults,
      message: `Limpeza concluída: ${cleanupResults.total_deleted} registros removidos`,
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Erro na limpeza de logs:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})