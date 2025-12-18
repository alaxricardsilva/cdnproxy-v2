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

    if (accessError) {
      logger.error('Erro ao buscar access logs:', accessError)
    }

    // Buscar dados de analytics
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics_data')
      .select('*')
      .eq('domain_id', domain)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', localNow.toISOString())

    if (analyticsError) {
      logger.error('Erro ao buscar analytics data:', analyticsError)
    }

    // Calcular métricas
    const logs = accessLogs || []
    const analytics = analyticsData || []

    // Total de visualizações
    const totalViews = logs.length

    // Visitantes únicos (baseado em IP)
    const uniqueVisitors = new Set(logs.map((log: any) => log.client_ip || log.real_ip)).size

    // Bytes transferidos
    const totalBytes = logs.reduce((sum: number, log: any) => sum + (log.bytes_transferred || log.bytes_sent || 0), 0)

    // Tempo de resposta médio
    const responseTimes = logs.filter((log: any) => log.response_time_ms).map((log: any) => log.response_time_ms)
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length)
      : 0

    return {
      success: true,
      data: {
        views: totalViews,
        visitors: uniqueVisitors,
        bytes: totalBytes,
        response_time: avgResponseTime
      },
      period: {
        start: startDate.toISOString(),
        end: localNow.toISOString(),
        period
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Erro no endpoint de métricas:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})