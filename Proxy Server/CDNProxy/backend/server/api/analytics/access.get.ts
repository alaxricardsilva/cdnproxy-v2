import { logger } from '~/utils/logger'
import { createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    const query = getQuery(event)
    const domain = query.domain as string
    const period = (query.period as string) || '24h'
    const limit = parseInt(query.limit as string) || 50
    
    if (!domain) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Domain ID é obrigatório'
      })
    }

    // Calcular período de tempo baseado no fuso horário de São Paulo
    const now = new Date()
    const saoPauloOffset = -3 * 60 // UTC-3 em minutos
    const localNow = new Date(now.getTime() + (saoPauloOffset * 60 * 1000))
    
    let startDate: Date
    switch (period) {
      case '7d':
        startDate = new Date(localNow.getTime() - (7 * 24 * 60 * 60 * 1000))
        break
      case '30d':
        startDate = new Date(localNow.getTime() - (30 * 24 * 60 * 60 * 1000))
        break
      case '90d':
        startDate = new Date(localNow.getTime() - (90 * 24 * 60 * 60 * 1000))
        break
      default: // 24h
        startDate = new Date(localNow.getTime() - (24 * 60 * 60 * 1000))
        break
    }

    // Buscar dados de access logs
    const { data: accessLogs, error: accessError } = await supabase
      .from('access_logs')
      .select('*')
      .eq('domain_id', domain)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', localNow.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (accessError) {
      logger.error('Erro ao buscar access logs:', accessError)
    }

    // Formatar dados para o frontend
    const formattedLogs = (accessLogs || []).map((log: any) => ({
      id: log.id,
      ip: log.client_ip || log.real_ip || 'N/A',
      path: log.path || '/',
      user_agent: log.user_agent ? log.user_agent.substring(0, 100) + '...' : 'N/A',
      status: log.status_code || 200,
      bytes: log.bytes_transferred || log.bytes_sent || 0,
      response_time: log.response_time_ms || 0,
      timestamp: log.created_at,
      country: log.country || 'Unknown',
      referer: log.referer || null,
      endpoint_type: log.endpoint_type || 'other'
    }))

    return {
      success: true,
      data: formattedLogs,
      period: {
        start: startDate.toISOString(),
        end: localNow.toISOString(),
        period
      },
      pagination: {
        limit,
        total: formattedLogs.length
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Erro no endpoint de access logs:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})