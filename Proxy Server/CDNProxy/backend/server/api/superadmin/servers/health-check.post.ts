import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '~/utils/timezone'

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

    // Read request body (optional server IDs to check specific servers)
    const body = await readBody(event).catch(() => ({}))
    const { server_ids } = body

    // Get servers to check
    let query = supabase.from('servers').select('*')
    
    if (server_ids && Array.isArray(server_ids) && server_ids.length > 0) {
      query = query.in('id', server_ids)
    }

    const { data: servers, error: fetchError } = await query

    if (fetchError) {
      logger.error('Erro ao buscar servidores:', fetchError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar servidores'
      })
    }

    if (!servers || servers.length === 0) {
      return {
        success: true,
        message: 'Nenhum servidor encontrado para verificação',
        data: {
          checked_servers: [],
          summary: {
            total: 0,
            online: 0,
            offline: 0,
            maintenance: 0,
            error: 0
          }
        }
      }
    }

    // Perform health checks
    const healthCheckResults = await Promise.allSettled(
      servers.map(server => performHealthCheck(server))
    )

    const checkedServers = []
    const summary = {
      total: servers.length,
      online: 0,
      offline: 0,
      maintenance: 0,
      error: 0
    }

    // Process results and update server statuses
    for (let i = 0; i < servers.length; i++) {
      const server = servers[i]
      const result = healthCheckResults[i]
      
      let newStatus = 'ERROR'
      let responseTime = null
      let errorMessage = null

      if (result && result.status === 'fulfilled') {
        const healthData = (result as PromiseFulfilledResult<any>).value
        newStatus = healthData.status
        responseTime = healthData.responseTime
        errorMessage = healthData.error
      } else if (result && result.status === 'rejected') {
        const rejectedResult = result as PromiseRejectedResult
        errorMessage = rejectedResult.reason?.message || 'Health check failed'
      }

      // Update server status in database
      await supabase
        .from('servers')
        .update({
          status: newStatus,
          last_health_check: toSaoPauloISOString(new Date()),
          response_time: responseTime,
          updated_at: toSaoPauloISOString(new Date())
        })
        .eq('id', server.id)

      // Add to results
      checkedServers.push({
        id: server.id,
        name: server.name,
        hostname: server.hostname,
        ip_address: server.ip_address,
        region: server.region,
        type: server.type,
        status: newStatus,
        response_time: responseTime,
        error_message: errorMessage,
        last_health_check: toSaoPauloISOString(new Date())
      })

      // Update summary
      switch (newStatus) {
        case 'ONLINE':
          summary.online++
          break
        case 'OFFLINE':
          summary.offline++
          break
        case 'MAINTENANCE':
          summary.maintenance++
          break
        case 'ERROR':
          summary.error++
          break
      }
    }

    // Log the health check action
    await supabase
      .from('admin_logs')
      .insert([{
        admin_id: user.id,
        action: 'HEALTH_CHECK_SERVERS',
        resource_type: 'server',
        resource_id: null,
        details: {
          checked_count: servers.length,
          summary,
          server_ids: servers.map(s => s.id)
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      }])

    return {
      success: true,
      message: `Health check concluído para ${servers.length} servidor(es)`,
      data: {
        checked_servers: checkedServers,
        summary
      }
    }

  } catch (error: any) {
    logger.error('Erro no health check:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Helper function to perform health check on a server
async function performHealthCheck(server: any): Promise<{
  status: string
  responseTime: number | null
  error: string | null
}> {
  const startTime = Date.now()
  
  try {
    // Skip health check for maintenance servers
    if (server.status === 'MAINTENANCE') {
      return {
        status: 'MAINTENANCE',
        responseTime: null,
        error: null
      }
    }

    // For the current server (localhost), we can do a simple check
    if (server.hostname === 'localhost' || server.ip_address === '127.0.0.1') {
      const responseTime = Date.now() - startTime
      return {
        status: 'ONLINE',
        responseTime,
        error: null
      }
    }

    // For remote servers, we would typically make HTTP requests
    // This is a simplified implementation
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(`http://${server.hostname}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ProxyCDN-HealthCheck/1.0'
      }
    }).catch(() => {
      clearTimeout(timeoutId)
      return null
    })
    
    clearTimeout(timeoutId)

    const responseTime = Date.now() - startTime

    if (response && response.ok) {
      return {
        status: 'ONLINE',
        responseTime,
        error: null
      }
    } else {
      return {
        status: 'OFFLINE',
        responseTime,
        error: response ? `HTTP ${response.status}` : 'Connection failed'
      }
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    return {
      status: 'ERROR',
      responseTime,
      error: error.message || 'Unknown error'
    }
  }
}

// Helper function to get client IP
function getClientIP(event: any): string {
  return getHeader(event, 'x-forwarded-for') || 
         getHeader(event, 'x-real-ip') || 
         getHeader(event, 'cf-connecting-ip') || 
         'unknown'
}