import { logger } from '../../../utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'
import { getGeoLocationFromIP } from '../../../utils/geolocation-service'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const domain = query.domain as string

    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    // Get current time and 5 minutes ago for real-time data
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

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

    // If no domains, return empty real-time data
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          activeVisitors: 0,
          currentRequests: 0,
          realtimeMetrics: {
            requestsPerSecond: 0,
            averageResponseTime: 0,
            errorRate: 0,
            cacheHitRate: 0
          },
          activePages: [],
          activeCountries: [],
          recentActivity: [],
          systemStatus: 'healthy'
        },
        timestamp: new Date().toISOString()
      }
    }

    // Build query for recent access logs (last 5 minutes)
    let realtimeQuery = supabase
      .from('access_logs')
      .select('*')
      .in('domain_id', domainIds)
      .gte('created_at', fiveMinutesAgo.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false })

    // Filter by specific domain if provided
    if (domain) {
      const domainRecord = userDomains?.find(d => d.domain === domain)
      if (domainRecord) {
        realtimeQuery = realtimeQuery.eq('domain_id', domainRecord.id)
      }
    }

    // Get recent logs for active visitors (last 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    let activeVisitorsQuery = supabase
      .from('access_logs')
      .select('ip_address, created_at')
      .in('domain_id', domainIds)
      .gte('created_at', thirtyMinutesAgo.toISOString())
      .lte('created_at', now.toISOString())

    if (domain) {
      const domainRecord = userDomains?.find(d => d.domain === domain)
      if (domainRecord) {
        activeVisitorsQuery = activeVisitorsQuery.eq('domain_id', domainRecord.id)
      }
    }

    // Execute queries
    const [realtimeResult, activeVisitorsResult] = await Promise.all([
      realtimeQuery,
      activeVisitorsQuery
    ])

    if (realtimeResult.error) {
      logger.error('Error fetching realtime logs:', realtimeResult.error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar logs em tempo real'
      })
    }

    if (activeVisitorsResult.error) {
      logger.error('Error fetching active visitors:', activeVisitorsResult.error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar visitantes ativos'
      })
    }

    const recentLogs = realtimeResult.data || []
    const visitorLogs = activeVisitorsResult.data || []

    // Calculate active visitors (unique IPs in last 30 minutes)
    const activeVisitors = new Set(visitorLogs.map(log => log.ip_address)).size

    // Calculate current requests (last 5 minutes)
    const currentRequests = recentLogs.length

    // Calculate real-time metrics
    const requestsPerSecond = recentLogs.length > 0 ? Math.round(recentLogs.length / 300) : 0 // 5 minutes = 300 seconds

    const responseTimes = recentLogs
      .map(log => log.response_time || 0)
      .filter(time => time > 0)
    const averageResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0

    const errorRequests = recentLogs.filter(log => log.status >= 400).length
    const errorRate = recentLogs.length > 0 ? Math.round((errorRequests / recentLogs.length) * 100) : 0

    const cacheHits = recentLogs.filter(log => log.cache_status === 'HIT').length
    const cacheHitRate = recentLogs.length > 0 ? Math.round((cacheHits / recentLogs.length) * 100) : 0

    // Get active pages (most visited in last 5 minutes)
    const pageCounts: Record<string, number> = {}
    recentLogs.forEach(log => {
      const path = log.path || '/'
      pageCounts[path] = (pageCounts[path] || 0) + 1
    })

    const activePages = Object.entries(pageCounts)
      .map(([path, visits]) => ({ path, visits: visits as number }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10)

    // Get active countries (from recent visitors)
    const countryCounts: Record<string, number> = {}
    for (const log of recentLogs) {
      const country = await getCountryFromIP(log.ip_address || '')
      countryCounts[country] = (countryCounts[country] || 0) + 1
    }

    const activeCountries = Object.entries(countryCounts)
      .map(([country, visitors]) => ({ country, visitors: visitors as number }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 5)

    // Get recent activity (last 20 requests)
    const recentActivity = recentLogs.slice(0, 20).map(log => {
      const domainRecord = userDomains?.find(d => d.id === log.domain_id)
      return {
        timestamp: log.created_at,
        domain: domainRecord?.domain || 'Unknown',
        path: log.path || '/',
        status: log.status || 200,
        responseTime: log.response_time || 0,
        country: getCountryFromIP(log.ip_address || ''),
        userAgent: getBrowserType(log.user_agent || '')
      }
    })

    // Determine system status
    let systemStatus = 'healthy'
    if (errorRate > 10) {
      systemStatus = 'warning'
    }
    if (errorRate > 25 || averageResponseTime > 2000) {
      systemStatus = 'critical'
    }

    return {
      success: true,
      data: {
        activeVisitors,
        currentRequests,
        realtimeMetrics: {
          requestsPerSecond,
          averageResponseTime,
          errorRate,
          cacheHitRate
        },
        activePages,
        activeCountries,
        recentActivity,
        systemStatus
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Error in analytics realtime:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

async function getCountryFromIP(ip: string): Promise<string> {
  try {
    const geoData = await getGeoLocationFromIP(ip)
    return geoData.country
  } catch (error) {
    logger.error('Erro ao obter país do IP:', error)
    return 'Desconhecido'
  }
}

function getBrowserType(userAgent: string): string {
  if (!userAgent) return 'Unknown'
  
  const ua = userAgent.toLowerCase()
  if (ua.includes('chrome') && !ua.includes('edge')) return 'Chrome'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('edge')) return 'Edge'
  if (ua.includes('opera')) return 'Opera'
  return 'Other'
}