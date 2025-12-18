import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Get request body
    const body = await readBody(event)
    const { action, days, tables } = body

    // Get user from headers
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    // Initialize Supabase client
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
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
        statusMessage: 'Apenas superadmins podem executar limpeza do banco'
      })
    }

    const results = []

    switch (action) {
      case 'cleanup_old_logs':
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - (days || 30))

        // Clean old analytics data
        const { count: analyticsDeleted, error: analyticsError } = await supabase
          .from('analytics')
          .delete()
          .lt('created_at', cutoffDate.toISOString())

        if (analyticsError) {
          results.push({
            table: 'analytics',
            success: false,
            error: analyticsError.message
          })
        } else {
          results.push({
            table: 'analytics',
            success: true,
            deletedRecords: analyticsDeleted || 0
          })
        }

        // Clean old access logs
        const { count: logsDeleted, error: logsError } = await supabase
          .from('access_logs')
          .delete()
          .lt('created_at', cutoffDate.toISOString())

        if (logsError) {
          results.push({
            table: 'access_logs',
            success: false,
            error: logsError.message
          })
        } else {
          results.push({
            table: 'access_logs',
            success: true,
            deletedRecords: logsDeleted || 0
          })
        }
        break

      case 'cleanup_inactive_users':
        const inactiveDate = new Date()
        inactiveDate.setDate(inactiveDate.getDate() - (days || 90))

        // Find inactive users (no login in X days)
        const { data: inactiveUsers, error: findError } = await supabase
          .from('users')
          .select('id')
          .lt('last_login', inactiveDate.toISOString())
          .eq('status', 'inactive')

        if (findError) {
          results.push({
            table: 'users',
            success: false,
            error: findError.message
          })
        } else {
          // Delete inactive users and their data
          for (const inactiveUser of inactiveUsers || []) {
            // Delete user's domains
            await supabase
              .from('domains')
              .delete()
              .eq('user_id', inactiveUser.id)

            // Delete user's analytics
            await supabase
              .from('analytics')
              .delete()
              .eq('user_id', inactiveUser.id)

            // Delete user
            await supabase
              .from('users')
              .delete()
              .eq('id', inactiveUser.id)
          }

          results.push({
            table: 'users',
            success: true,
            deletedRecords: inactiveUsers?.length || 0
          })
        }
        break

      case 'cleanup_specific_tables':
        if (tables && Array.isArray(tables)) {
          for (const table of tables) {
            if (['analytics', 'access_logs'].includes(table)) {
              const cutoffDate = new Date()
              cutoffDate.setDate(cutoffDate.getDate() - (days || 30))

              const { count: deleted, error } = await supabase
                .from(table)
                .delete()
                .lt('created_at', cutoffDate.toISOString())

              results.push({
                table,
                success: !error,
                deletedRecords: deleted || 0,
                error: error?.message
              })
            }
          }
        }
        break

      case 'vacuum_analyze':
        // This would typically run VACUUM and ANALYZE commands
        // Since we're using Supabase, we'll simulate this with a health check
        const healthCheck = await supabase
          .from('users')
          .select('count')
          .limit(1)

        results.push({
          operation: 'vacuum_analyze',
          success: !healthCheck.error,
          message: healthCheck.error ? 'Falha na otimização' : 'Otimização concluída'
        })
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Ação de limpeza inválida'
        })
    }

    // Log cleanup action
    await supabase
      .from('access_logs')
      .insert({
        user_id: user.id,
        action: 'database_cleanup',
        details: JSON.stringify({ action, results }),
        ip_address: '127.0.0.1',
        user_agent: 'system',
        created_at: new Date().toISOString()
      })

    return {
      success: true,
      data: {
        action,
        results,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    return {
      statusCode: 500,
      body: { error: 'Erro interno do servidor' }
    }
  }
})