import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, getQuery, getHeader, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

    const domainId = getRouterParam(event, 'domainId')
    const query = getQuery(event)
    
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Domain ID is required'
      })
    }

    // Get user from headers (JWT token)
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

    // Verify JWT token and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Verify domain belongs to user
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain, user_id')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      logger.error('Domínio não encontrado:', { domainId, userId: user.id, error: domainError })
      throw createError({
        statusCode: 404,
        statusMessage: `Domínio com ID '${domainId}' não foi encontrado ou não pertence ao usuário`
      })
    }
    
    // Parâmetros de filtro
    const period = query.period as string || '24h'
    const startDate = query.startDate as string
    const endDate = query.endDate as string
    
    // Calcular intervalo de tempo
    let timeStart: Date
    let timeEnd = new Date()
    
    if (startDate && endDate) {
      timeStart = new Date(startDate)
      timeEnd = new Date(endDate)
    } else {
      const now = new Date()
      let hoursBack = 24
      
      switch (period) {
        case '1h': hoursBack = 1; break
        case '6h': hoursBack = 6; break
        case '24h': hoursBack = 24; break
        case '7d': hoursBack = 24 * 7; break
        case '30d': hoursBack = 24 * 30; break
        default: hoursBack = 24
      }
      
      timeStart = new Date(now.getTime() - hoursBack * 60 * 60 * 1000)
    }
    
    // Buscar métricas de access logs
    const { data: accessLogs, error: accessError } = await supabase
      .from('access_logs')
      .select('*')
      .eq('domain_id', domainId)
      .gte('created_at', timeStart.toISOString())
      .lte('created_at', timeEnd.toISOString())
      .order('created_at', { ascending: false })
    
    if (accessError) {
      logger.error('Error fetching access logs:', accessError)
    }
    
    // Buscar métricas HLS
    const { data: hlsMetrics, error: hlsError } = await supabase
      .from('hls_metrics')
      .select('*')
      .eq('domain_id', domainId)
      .gte('created_at', timeStart.toISOString())
      .lte('created_at', timeEnd.toISOString())
      .order('created_at', { ascending: false })
    
    if (hlsError) {
      logger.error('Error fetching HLS metrics:', hlsError)
    }
    
    // Buscar métricas de streaming
    const { data: streamingMetrics, error: streamingError } = await supabase
      .from('streaming_metrics')
      .select('*')
      .eq('domain_id', domainId)
      .gte('created_at', timeStart.toISOString())
      .lte('created_at', timeEnd.toISOString())
      .order('created_at', { ascending: false })
    
    if (streamingError) {
      logger.error('Error fetching streaming metrics:', streamingError)
    }
    
    // Calcular estatísticas
    const totalViews = accessLogs?.length || 0
    const uniqueVisitors = new Set(accessLogs?.map(log => log.real_ip) || []).size
    const totalBytesTransferred = accessLogs?.reduce((sum, log) => sum + (log.bytes_transferred || 0), 0) || 0
    const avgResponseTime = accessLogs?.length 
      ? accessLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / accessLogs.length 
      : 0
    
    // Estatísticas por endpoint
    const endpointStats: Record<string, { count: number; bytes: number; avgResponseTime: number }> = {}
    accessLogs?.forEach(log => {
      const type = log.endpoint_type || 'other'
      if (!endpointStats[type]) {
        endpointStats[type] = {
          count: 0,
          bytes: 0,
          avgResponseTime: 0
        }
      }
      endpointStats[type].count++
      endpointStats[type].bytes += log.bytes_transferred || 0
    })
    
    // Calcular tempo médio de resposta por endpoint
    Object.keys(endpointStats).forEach(type => {
      const logs = accessLogs?.filter(log => log.endpoint_type === type) || []
      if (endpointStats[type]) {
        endpointStats[type].avgResponseTime = logs.length 
          ? logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logs.length 
          : 0
      }
    })
    
    // Top países
    const countryStats: Record<string, number> = {}
    accessLogs?.forEach(log => {
      const country = log.country || 'Unknown'
      countryStats[country] = (countryStats[country] || 0) + 1
    })
    
    const topCountries = Object.entries(countryStats)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))
    
    // Estatísticas de streaming
    const streamingStats = {
      totalSessions: streamingMetrics?.length || 0,
      totalDuration: streamingMetrics?.reduce((sum, metric) => sum + (metric.total_duration || 0), 0) || 0,
      avgCompletionRate: streamingMetrics?.length 
        ? streamingMetrics.reduce((sum, metric) => sum + (metric.completion_rate || 0), 0) / streamingMetrics.length 
        : 0,
      totalBandwidthConsumed: streamingMetrics?.reduce((sum, metric) => sum + (metric.bandwidth_consumed || 0), 0) || 0
    }
    
    // HLS específico
    const hlsStats = {
      totalSegments: hlsMetrics?.length || 0,
      avgBufferHealth: hlsMetrics?.length 
        ? hlsMetrics.reduce((sum, metric) => sum + (metric.buffer_health || 0), 0) / hlsMetrics.length 
        : 0,
      totalDroppedFrames: hlsMetrics?.reduce((sum, metric) => sum + (metric.dropped_frames || 0), 0) || 0,
      avgBitrate: hlsMetrics?.length 
        ? hlsMetrics.reduce((sum, metric) => sum + (metric.bitrate || 0), 0) / hlsMetrics.length 
        : 0
    }
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      period,
      domainId,
      summary: {
        totalViews,
        uniqueVisitors,
        totalBytesTransferred,
        avgResponseTime: Math.round(avgResponseTime)
      },
      endpoints: endpointStats,
      countries: topCountries,
      streaming: streamingStats,
      hls: hlsStats,
      recentLogs: accessLogs?.slice(0, 50) || [],
      recentHLS: hlsMetrics?.slice(0, 20) || [],
      recentStreaming: streamingMetrics?.slice(0, 20) || []
    }
  } catch (error: any) {
    logger.error('Error fetching analytics:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})