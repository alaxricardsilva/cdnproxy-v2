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

    // If no domains, return empty error data
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          totalErrors: 0,
          errorRate: 0,
          errorsByStatus: [],
          errorsByDomain: [],
          errorsByPath: [],
          errorTimeline: [],
          topErrors: [],
          criticalErrors: 0,
          serverErrors: 0,
          clientErrors: 0
        },
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          period
        },
        timestamp: new Date().toISOString()
      }
    }

    // Build query for error logs (status_code >= 400)
    let errorLogsQuery = supabase
      .from('access_logs')
      .select('*')
      .in('domain_id', domainIds)
      .gte('status_code', 400)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Filter by specific domain if provided
    if (domain) {
      const domainRecord = userDomains?.find(d => d.domain === domain)
      if (domainRecord) {
        errorLogsQuery = errorLogsQuery.eq('domain_id', domainRecord.id)
      }
    }

    // Get all logs for error rate calculation
    let allLogsQuery = supabase
      .from('access_logs')
      .select('id, status_code')
      .in('domain_id', domainIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (domain) {
      const domainRecord = userDomains?.find(d => d.domain === domain)
      if (domainRecord) {
        allLogsQuery = allLogsQuery.eq('domain_id', domainRecord.id)
      }
    }

    // Execute queries
    const [errorLogsResult, allLogsResult] = await Promise.all([
      errorLogsQuery,
      allLogsQuery
    ])

    if (errorLogsResult.error) {
      logger.error('Error fetching error logs:', errorLogsResult.error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar logs de erro'
      })
    }

    if (allLogsResult.error) {
      logger.error('Error fetching all logs:', allLogsResult.error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar todos os logs'
      })
    }

    const errorLogs = errorLogsResult.data || []
    const allLogs = allLogsResult.data || []

    // Calculate error metrics
    const totalErrors = errorLogs.length
    const totalRequests = allLogs.length
    const errorRate = totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100) : 0

    // Categorize errors
    const criticalErrors = errorLogs.filter(log => log.status_code >= 500).length
    const serverErrors = errorLogs.filter(log => log.status_code >= 500 && log.status_code < 600).length
    const clientErrors = errorLogs.filter(log => log.status_code >= 400 && log.status_code < 500).length

    // Calculate errors by status code
    const errorsByStatus: Record<number, number> = {}
    errorLogs.forEach(log => {
      const status = log.status_code || 500
      if (!errorsByStatus[status]) {
        errorsByStatus[status] = 0
      }
      errorsByStatus[status]++
    })

    const errorsByStatusArray = Object.entries(errorsByStatus)
      .map(([status, count]) => ({ 
        status: parseInt(status), 
        count: count as number,
        percentage: Math.round((count as number / totalErrors) * 100),
        category: getErrorCategory(parseInt(status))
      }))
      .sort((a, b) => b.count - a.count)

    // Calculate errors by domain
    const errorsByDomain: Record<string, number> = {}
    errorLogs.forEach(log => {
      const domainRecord = userDomains?.find(d => d.id === log.domain_id)
      if (domainRecord && domainRecord.domain) {
        if (!errorsByDomain[domainRecord.domain]) {
          errorsByDomain[domainRecord.domain] = 0
        }
        errorsByDomain[domainRecord.domain]++
      }
    })

    const errorsByDomainArray = Object.entries(errorsByDomain)
      .map(([domain, count]) => ({ domain, count: count as number }))
      .sort((a, b) => b.count - a.count)

    // Calculate errors by path
    const errorsByPath: Record<string, { count: number, statuses: number[] }> = {}
    errorLogs.forEach(log => {
      const path = log.path || '/'
      if (!errorsByPath[path]) {
        errorsByPath[path] = { count: 0, statuses: [] }
      }
      errorsByPath[path].count++
      if (!errorsByPath[path].statuses.includes(log.status_code)) {
        errorsByPath[path].statuses.push(log.status_code)
      }
    })

    const errorsByPathArray = Object.entries(errorsByPath)
      .map(([path, data]) => ({ 
        path, 
        count: data.count,
        statuses: data.statuses.sort((a, b) => a - b),
        mostCommonStatus: data.statuses.reduce((a, b, _, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        )
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Get top errors with details
    const topErrors = errorsByPathArray.slice(0, 10).map(error => ({
      ...error,
      category: getErrorCategory(error.mostCommonStatus),
      severity: error.mostCommonStatus >= 500 ? 'critical' : 'warning'
    }))

    // Generate error timeline
    const errorTimeline = generateErrorTimeline(errorLogs, startDate, endDate, period)

    return {
      success: true,
      data: {
        totalErrors,
        errorRate,
        errorsByStatus: errorsByStatusArray,
        errorsByDomain: errorsByDomainArray,
        errorsByPath: errorsByPathArray,
        errorTimeline,
        topErrors,
        criticalErrors,
        serverErrors,
        clientErrors
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        period
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Error in analytics errors:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

function getErrorCategory(status: number): string {
  if (status >= 500) return 'Server Error'
  if (status >= 400) return 'Client Error'
  return 'Unknown'
}

function generateErrorTimeline(errorLogs: any[], startDate: Date, endDate: Date, period: string) {
  const timeline = []
  const isHourly = period === '1d'
  
  if (isHourly) {
    // Generate hourly data for 1 day
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startDate)
      hourStart.setHours(hour, 0, 0, 0)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hour + 1, 0, 0, 0)
      
      const hourErrors = errorLogs.filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= hourStart && logDate < hourEnd
      })
      
      timeline.push({
        timestamp: toSaoPauloISOString(hourStart),
        errors: hourErrors.length,
        serverErrors: hourErrors.filter(log => log.status_code >= 500).length,
        clientErrors: hourErrors.filter(log => log.status_code >= 400 && log.status_code < 500).length
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
      
      const dayErrors = errorLogs.filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= dayStart && logDate < dayEnd
      })
      
      timeline.push({
        timestamp: toSaoPauloISOString(dayStart),
        errors: dayErrors.length,
        serverErrors: dayErrors.filter(log => log.status_code >= 500).length,
        clientErrors: dayErrors.filter(log => log.status_code >= 400 && log.status_code < 500).length
      })
    }
  }
  
  return timeline
}