import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    // Get query parameters
    const query = getQuery(event)
    const domainId = query.domainId as string
    const startDate = query.startDate as string
    const endDate = query.endDate as string
    const period = query.period as string || '7d'

    // Calcular datas se não fornecidas
    let start = startDate ? new Date(startDate) : new Date()
    let end = endDate ? new Date(endDate) : new Date()

    if (!startDate) {
      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24)
          break
        case '7d':
          start.setDate(start.getDate() - 7)
          break
        case '30d':
          start.setDate(start.getDate() - 30)
          break
        case '90d':
          start.setDate(start.getDate() - 90)
          break
        default:
          start.setDate(start.getDate() - 7)
      }
    }

    // Construir query base para analytics
    let analyticsQuery = supabase
      .from('analytics')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    // Filtrar por domínio se especificado
    if (domainId) {
      analyticsQuery = analyticsQuery.eq('domain_id', domainId)
    }

    // Buscar dados de analytics
    const { data: analyticsData, error: analyticsError } = await analyticsQuery
      .order('created_at', { ascending: true })

    if (analyticsError) {
      logger.error('Erro ao buscar dados de analytics:', analyticsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar dados de tráfego'
      })
    }

    // Processar dados para gráficos
    const trafficData = {
      total_visits: 0,
      total_bandwidth: 0,
      unique_visitors: 0,
      bounce_rate: 0,
      avg_session_duration: 0,
      timeline: [] as any[],
      top_pages: [] as any[],
      top_countries: [] as any[],
      devices: {
        desktop: 0,
        mobile: 0,
        tablet: 0
      },
      browsers: {} as Record<string, number>
    }

    // Agregar dados
    if (analyticsData && analyticsData.length > 0) {
      trafficData.total_visits = analyticsData.reduce((sum, item) => sum + (item.visits || 0), 0)
      trafficData.total_bandwidth = analyticsData.reduce((sum, item) => sum + (item.bandwidth || 0), 0)

      // Agrupar por data para timeline
      const timelineMap = new Map()
      analyticsData.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0]
        if (!timelineMap.has(date)) {
          timelineMap.set(date, { date, visits: 0, bandwidth: 0 })
        }
        const entry = timelineMap.get(date)
        entry.visits += item.visits || 0
        entry.bandwidth += item.bandwidth || 0
      })

      trafficData.timeline = Array.from(timelineMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    }

    // Buscar dados de access logs para informações mais detalhadas
    let accessLogsQuery = supabase
      .from('access_logs')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    if (domainId) {
      accessLogsQuery = accessLogsQuery.eq('domain_id', domainId)
    }

    const { data: accessLogs, error: logsError } = await accessLogsQuery
      .limit(1000) // Limitar para performance

    if (!logsError && accessLogs) {
      // Processar logs de acesso para estatísticas detalhadas
      const uniqueIPs = new Set()
      const countries = new Map()
      const pages = new Map()

      accessLogs.forEach(log => {
        uniqueIPs.add(log.ip_address)
        
        if (log.country) {
          countries.set(log.country, (countries.get(log.country) || 0) + 1)
        }
        
        if (log.path) {
          pages.set(log.path, (pages.get(log.path) || 0) + 1)
        }
      })

      trafficData.unique_visitors = uniqueIPs.size

      // Top países
      trafficData.top_countries = Array.from(countries.entries())
        .map(([country, visits]) => ({ country, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10)

      // Top páginas
      trafficData.top_pages = Array.from(pages.entries())
        .map(([page, visits]) => ({ page, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10)
    }

    return {
      success: true,
      data: trafficData,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        period
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Erro na API de tráfego:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})