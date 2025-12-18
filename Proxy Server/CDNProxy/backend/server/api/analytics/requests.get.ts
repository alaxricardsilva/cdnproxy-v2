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

    // If no domains, return empty requests data
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageRequestsPerHour: 0,
          peakRequestsPerHour: 0,
          requestsByDomain: [],
          requestsByStatus: [],
          requestsByMethod: [],
          timeline: [],
          topPaths: []
        },
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          period
        },
        timestamp: toSaoPauloISOString()
      }
    }

    // Build query for access logs
    let accessLogsQuery = supabase
      .from('access_logs')
      .select('*')
      .in('domain_id', domainIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Filter by specific domain if provided
    if (domain) {
      const domainRecord = userDomains?.find(d => d.domain === domain)
      if (domainRecord) {
        accessLogsQuery = accessLogsQuery.eq('domain_id', domainRecord.id)
      }
    }

    // Execute query
    const { data: accessLogs, error: logsError } = await accessLogsQuery

    if (logsError) {
      logger.error('Error fetching access logs:', logsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar logs de acesso'
      })
    }

    const logs = accessLogs || []

    // Calculate request metrics
    const totalRequests = logs.length
    const successfulRequests = logs.filter(log => log.status < 400).length
    const failedRequests = logs.filter(log => log.status >= 400).length

    // Calculate requests by domain
    const requestsByDomain: Record<string, number> = {}
    logs.forEach(log => {
      const domainRecord = userDomains?.find(d => d.id === log.domain_id)
      if (domainRecord && domainRecord.domain) {
        if (!requestsByDomain[domainRecord.domain]) {
          requestsByDomain[domainRecord.domain] = 0
        }
        requestsByDomain[domainRecord.domain]++
      }
    })

    const requestsByDomainArray = Object.entries(requestsByDomain)
      .map(([domain, requests]) => ({ domain, requests: requests as number }))
      .sort((a, b) => b.requests - a.requests)

    // Calculate requests by status code
    const requestsByStatus: Record<number, number> = {}
    logs.forEach(log => {
      const status = log.status || 200
      if (!requestsByStatus[status]) {
        requestsByStatus[status] = 0
      }
      requestsByStatus[status]++
    })

    const requestsByStatusArray = Object.entries(requestsByStatus)
      .map(([status, count]) => ({ 
        status: parseInt(status), 
        count: count as number,
        percentage: Math.round((count as number / totalRequests) * 100)
      }))
      .sort((a, b) => b.count - a.count)

    // Calculate requests by method
    const requestsByMethod: Record<string, number> = {}
    logs.forEach(log => {
      const method = log.method || 'GET'
      if (!requestsByMethod[method]) {
        requestsByMethod[method] = 0
      }
      requestsByMethod[method]++
    })

    const requestsByMethodArray = Object.entries(requestsByMethod)
      .map(([method, count]) => ({ 
        method, 
        count: count as number,
        percentage: Math.round((count as number / totalRequests) * 100)
      }))
      .sort((a, b) => b.count - a.count)

    // Get top paths
    const pathCounts: Record<string, number> = {}
    logs.forEach(log => {
      const path = log.path || '/'
      if (!pathCounts[path]) {
        pathCounts[path] = 0
      }
      pathCounts[path]++
    })

    const topPaths = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Generate timeline data
    const timeline = generateRequestsTimeline(logs, startDate, endDate, period)

    // Calculate hourly averages and peak
    const hourlyData = timeline.map(t => t.requests)
    const averageRequestsPerHour = hourlyData.length > 0 
      ? Math.round(hourlyData.reduce((sum, count) => sum + count, 0) / hourlyData.length)
      : 0
    const peakRequestsPerHour = Math.max(...hourlyData, 0)

    return {
      success: true,
      data: {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageRequestsPerHour,
        peakRequestsPerHour,
        requestsByDomain: requestsByDomainArray,
        requestsByStatus: requestsByStatusArray,
        requestsByMethod: requestsByMethodArray,
        timeline,
        topPaths
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        period
      },
      timestamp: toSaoPauloISOString()
    }

  } catch (error: any) {
    logger.error('Error in analytics requests:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

function generateRequestsTimeline(logs: any[], startDate: Date, endDate: Date, period: string) {
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
      
      timeline.push({
        timestamp: toSaoPauloISOString(hourStart),
        requests: hourLogs.length,
        successful: hourLogs.filter(log => log.status < 400).length,
        failed: hourLogs.filter(log => log.status >= 400).length
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
      
      timeline.push({
        timestamp: toSaoPauloISOString(dayStart),
        requests: dayLogs.length,
        successful: dayLogs.filter(log => log.status < 400).length,
        failed: dayLogs.filter(log => log.status >= 400).length
      })
    }
  }
  
  return timeline
}