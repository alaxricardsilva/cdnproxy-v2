import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const period = query.period as string || '7d' // 1d, 7d, 30d, 90d
    const domain = query.domain as string

    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    // Get user's domains
    const { data: userDomains, error: domainsError } = await supabase
      .from('domains')
      .select('id, domain')
      .eq('user_id', user.id)

    if (domainsError) {
      logger.error('Error fetching user domains:', domainsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar domínios do usuário'
      })
    }

    const domainIds = userDomains?.map(d => d.id) || []

    // If no domains, return empty performance data
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          averageResponseTime: 0,
          medianResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          totalRequests: 0,
          cacheHitRate: 0,
          performanceByDomain: [],
          responseTimeTimeline: [],
          slowestEndpoints: [],
          performanceScore: 0,
          recommendations: []
        },
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          period
        },
        timestamp: new Date().toISOString()
      }
    }

    // Build query for performance logs
    let performanceQuery = supabase
      .from('access_logs')
      .select('*')
      .in('domain_id', domainIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Filter by specific domain if provided
    if (domain) {
      const domainRecord = userDomains?.find(d => d.domain === domain)
      if (domainRecord) {
        performanceQuery = performanceQuery.eq('domain_id', domainRecord.id)
      }
    }

    // Execute query
    const { data: performanceLogs, error: logsError } = await performanceQuery

    if (logsError) {
      logger.error('Error fetching performance logs:', logsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar logs de performance'
      })
    }

    const logs = performanceLogs || []

    // Calculate response time metrics
    const responseTimes = logs
      .map(log => log.response_time || 0)
      .filter(time => time > 0)
      .sort((a, b) => a - b)

    const totalRequests = logs.length
    const averageResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0

    const medianResponseTime = responseTimes.length > 0
      ? responseTimes[Math.floor(responseTimes.length / 2)]
      : 0

    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p95ResponseTime = responseTimes.length > 0 ? responseTimes[p95Index] || 0 : 0

    const p99Index = Math.floor(responseTimes.length * 0.99)
    const p99ResponseTime = responseTimes.length > 0 ? responseTimes[p99Index] || 0 : 0

    // Calculate cache hit rate
    const cacheHits = logs.filter(log => log.cache_status === 'HIT').length
    const cacheHitRate = totalRequests > 0 ? Math.round((cacheHits / totalRequests) * 100) : 0

    // Calculate performance by domain
    const performanceByDomain: Record<string, {
      requests: number
      avgResponseTime: number
      cacheHitRate: number
    }> = {}

    logs.forEach(log => {
      const domainRecord = userDomains?.find(d => d.id === log.domain_id)
      if (domainRecord?.domain) {
        if (!performanceByDomain[domainRecord.domain]) {
          performanceByDomain[domainRecord.domain] = {
            requests: 0,
            avgResponseTime: 0,
            cacheHitRate: 0
          }
        }
        performanceByDomain[domainRecord.domain].requests++
        performanceByDomain[domainRecord.domain].avgResponseTime += log.response_time || 0
      }
    })

    // Calculate averages and cache hit rates for each domain
    const performanceByDomainArray = Object.entries(performanceByDomain)
      .map(([domain, data]) => {
        const domainLogs = logs.filter(log => {
          const domainRecord = userDomains?.find(d => d.id === log.domain_id)
          return domainRecord?.domain === domain
        })
        
        const domainCacheHits = domainLogs.filter(log => log.cache_status === 'HIT').length
        
        return {
          domain,
          requests: data.requests,
          avgResponseTime: data.requests > 0 
            ? Math.round(data.avgResponseTime / data.requests) 
            : 0,
          cacheHitRate: data.requests > 0 
            ? Math.round((domainCacheHits / data.requests) * 100) 
            : 0
        }
      })
      .sort((a, b) => b.requests - a.requests)

    // Find slowest endpoints
    const endpointPerformance: Record<string, {
      count: number
      totalResponseTime: number
      maxResponseTime: number
    }> = {}

    logs.forEach(log => {
      const path = log.path || '/'
      if (!endpointPerformance[path]) {
        endpointPerformance[path] = {
          count: 0,
          totalResponseTime: 0,
          maxResponseTime: 0
        }
      }
      endpointPerformance[path].count++
      endpointPerformance[path].totalResponseTime += log.response_time || 0
      endpointPerformance[path].maxResponseTime = Math.max(
        endpointPerformance[path].maxResponseTime,
        log.response_time || 0
      )
    })

    const slowestEndpoints = Object.entries(endpointPerformance)
      .map(([path, data]) => ({
        path,
        requests: data.count,
        avgResponseTime: data.count > 0 
          ? Math.round(data.totalResponseTime / data.count) 
          : 0,
        maxResponseTime: data.maxResponseTime
      }))
      .filter(endpoint => endpoint.requests >= 5) // Only show endpoints with significant traffic
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10)

    // Generate response time timeline
    const responseTimeTimeline = generateResponseTimeTimeline(logs, startDate, endDate, period)

    // Calculate performance score (0-100)
    let performanceScore = 100
    if (averageResponseTime > 1000) performanceScore -= 30
    else if (averageResponseTime > 500) performanceScore -= 15
    else if (averageResponseTime > 200) performanceScore -= 5

    if (p95ResponseTime > 2000) performanceScore -= 20
    else if (p95ResponseTime > 1000) performanceScore -= 10

    if (cacheHitRate < 50) performanceScore -= 20
    else if (cacheHitRate < 70) performanceScore -= 10
    else if (cacheHitRate < 85) performanceScore -= 5

    performanceScore = Math.max(0, performanceScore)

    // Generate recommendations
    const recommendations = []
    if (averageResponseTime > 500) {
      recommendations.push('Considere otimizar os endpoints mais lentos para melhorar o tempo de resposta médio')
    }
    if (cacheHitRate < 70) {
      recommendations.push('Melhore a configuração de cache para aumentar a taxa de acerto')
    }
    if (p95ResponseTime > 1500) {
      recommendations.push('Investigue os endpoints com maior latência no percentil 95')
    }
    if (slowestEndpoints.length > 0 && slowestEndpoints[0].avgResponseTime > 1000) {
      recommendations.push(`Otimize o endpoint ${slowestEndpoints[0].path} que está com tempo de resposta elevado`)
    }

    return {
      success: true,
      data: {
        averageResponseTime,
        medianResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        totalRequests,
        cacheHitRate,
        performanceByDomain: performanceByDomainArray,
        responseTimeTimeline,
        slowestEndpoints,
        performanceScore,
        recommendations
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        period
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Error in analytics performance:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

function generateResponseTimeTimeline(logs: any[], startDate: Date, endDate: Date, period: string) {
  const timeline = []
  const isHourly = period === '1d'
  
  if (isHourly) {
    // Generate hourly data for 1 day
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startDate)
      hourStart.setHours(hour, 0, 0, 0)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hour + 1, 0, 0, 0)
      
      const hourLogs = logs.filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= hourStart && logDate < hourEnd
      })
      
      const hourResponseTimes = hourLogs
        .map(log => log.response_time || 0)
        .filter(time => time > 0)
      
      const avgResponseTime = hourResponseTimes.length > 0
        ? Math.round(hourResponseTimes.reduce((sum, time) => sum + time, 0) / hourResponseTimes.length)
        : 0
      
      timeline.push({
        timestamp: toSaoPauloISOString(hourStart),
        avgResponseTime,
        requests: hourLogs.length,
        cacheHits: hourLogs.filter(log => log.cache_status === 'HIT').length
      })
    }
  } else {
    // Generate daily data
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    for (let day = 0; day < days; day++) {
      const dayStart = new Date(startDate)
      dayStart.setDate(startDate.getDate() + day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)
      
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= dayStart && logDate < dayEnd
      })
      
      const dayResponseTimes = dayLogs
        .map(log => log.response_time || 0)
        .filter(time => time > 0)
      
      const avgResponseTime = dayResponseTimes.length > 0
        ? Math.round(dayResponseTimes.reduce((sum, time) => sum + time, 0) / dayResponseTimes.length)
        : 0
      
      timeline.push({
        timestamp: toSaoPauloISOString(dayStart),
        avgResponseTime,
        requests: dayLogs.length,
        cacheHits: dayLogs.filter(log => log.cache_status === 'HIT').length
      })
    }
  }
  
  return timeline
}