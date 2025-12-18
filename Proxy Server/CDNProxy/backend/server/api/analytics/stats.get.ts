import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'

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

    // Get user's domains first
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

    // If no domains, return empty stats
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          totalRequests: 0,
          totalBandwidth: 0,
          uniqueVisitors: 0,
          topCountries: [],
          topPaths: [],
          hourlyData: [],
          statusCodes: []
        },
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    }

    // Build base query for access logs
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
    const { data: accessLogs, error } = await accessLogsQuery

    if (error) {
      logger.error('Error fetching access logs:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar logs de acesso'
      })
    }

    // Aggregate data
    const stats = {
      totalRequests: accessLogs?.length || 0,
      totalBandwidth: accessLogs?.reduce((sum, record) => sum + (record.bytes_transferred || 0), 0) || 0,
      uniqueVisitors: new Set(accessLogs?.map(record => record.real_ip)).size || 0,
      topCountries: getTopCountries(accessLogs || []),
      topPaths: getTopPaths(accessLogs || []),
      hourlyData: getHourlyData(accessLogs || [], startDate, endDate),
      statusCodes: getStatusCodes(accessLogs || [])
    }

    return {
      success: true,
      data: stats,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    }

  } catch (error) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Helper functions
function getTopCountries(accessLogs: any[]): Array<{country: string, count: number, percentage: number}> {
  const countryCount = accessLogs.reduce((acc, record) => {
    const country = record.country || 'Unknown'
    acc[country] = (acc[country] || 0) + 1
    return acc
  }, {})

  const total = accessLogs.length
  return Object.entries(countryCount)
    .map(([country, count]) => ({
      country,
      count: count as number,
      percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function getTopPaths(accessLogs: any[]): Array<{path: string, count: number}> {
  const pathCount = accessLogs.reduce((acc, record) => {
    const path = record.request_path || '/'
    acc[path] = (acc[path] || 0) + 1
    return acc
  }, {})

  return Object.entries(pathCount)
    .map(([path, count]) => ({ path, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function getHourlyData(accessLogs: any[], startDate: Date, endDate: Date): Array<{hour: string, requests: number}> {
  const hourlyData = {}
  const current = new Date(startDate)

  // Initialize all hours with 0
  while (current <= endDate) {
    const hour = current.toISOString().slice(0, 13) + ':00:00.000Z'
    hourlyData[hour] = 0
    current.setHours(current.getHours() + 1)
  }

  // Count requests per hour
  accessLogs.forEach(record => {
    const hour = new Date(record.created_at).toISOString().slice(0, 13) + ':00:00.000Z'
    if (hourlyData.hasOwnProperty(hour)) {
      hourlyData[hour]++
    }
  })

  return Object.entries(hourlyData)
    .map(([hour, requests]) => ({ hour, requests: requests as number }))
    .sort((a, b) => a.hour.localeCompare(b.hour))
}

function getStatusCodes(accessLogs: any[]): Array<{code: number, count: number}> {
  const statusCount = accessLogs.reduce((acc, record) => {
    const status = record.status_code || 200
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return Object.entries(statusCount)
    .map(([code, count]) => ({ code: parseInt(code), count: count as number }))
    .sort((a, b) => b.count - a.count)
}