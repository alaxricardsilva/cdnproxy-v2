import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const period = query.period as string || '7d' // 1d, 7d, 30d, 90d

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
      .select('id, domain, status, created_at')
      .eq('user_id', user.id)

    if (domainsError) {
      logger.error('Error fetching user domains:', domainsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar domínios do usuário'
      })
    }

    const domainIds = userDomains?.map(d => d.id) || []

    // If no domains, return empty overview
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          totalDomains: 0,
          activeDomains: 0,
          totalRequests: 0,
          totalBandwidth: 0,
          uniqueVisitors: 0,
          averageResponseTime: 0,
          topDomains: [],
          recentActivity: [],
          performanceMetrics: {
            uptime: 100,
            errorRate: 0,
            avgResponseTime: 0
          }
        },
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          period
        },
        timestamp: new Date().toISOString()
      }
    }

    // Get access logs for the period
    const { data: accessLogs, error: logsError } = await supabase
      .from('access_logs')
      .select('*')
      .in('domain_id', domainIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (logsError) {
      logger.error('Error fetching access logs:', logsError)
      // Continue with empty logs instead of failing
    }

    const logs = accessLogs || []

    // Calculate overview metrics
    const totalRequests = logs.length
    const totalBandwidth = logs.reduce((sum, log) => sum + (log.bytes_sent || 0), 0)
    const uniqueVisitors = new Set(logs.map(log => log.client_ip)).size
    const activeDomains = userDomains?.filter(d => d.status === 'active').length || 0

    // Calculate average response time
    const responseTimes = logs.filter(log => log.response_time).map(log => log.response_time)
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0

    // Get top domains by requests
    const domainStats = {}
    logs.forEach(log => {
      const domain = userDomains?.find(d => d.id === log.domain_id)
      if (domain) {
        if (!domainStats[domain.domain]) {
          domainStats[domain.domain] = { requests: 0, bandwidth: 0 }
        }
        domainStats[domain.domain].requests++
        domainStats[domain.domain].bandwidth += log.bytes_sent || 0
      }
    })

    const topDomains = Object.entries(domainStats)
      .map(([domain, stats]) => ({ domain, ...stats }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5)

    // Get recent activity (last 10 requests)
    const recentActivity = logs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(log => {
        const domain = userDomains?.find(d => d.id === log.domain_id)
        return {
          timestamp: log.created_at,
          domain: domain?.domain || 'Unknown',
          method: log.method || 'GET',
          path: log.path || '/',
          status: log.status || 200,
          responseTime: log.response_time || 0,
          clientIp: log.client_ip
        }
      })

    // Calculate performance metrics
    const errorLogs = logs.filter(log => log.status >= 400)
    const errorRate = totalRequests > 0 ? (errorLogs.length / totalRequests) * 100 : 0
    const uptime = errorRate < 5 ? 100 - errorRate : 95 // Simplified uptime calculation

    return {
      success: true,
      data: {
        totalDomains: userDomains?.length || 0,
        activeDomains,
        totalRequests,
        totalBandwidth,
        uniqueVisitors,
        averageResponseTime: Math.round(averageResponseTime),
        topDomains,
        recentActivity,
        performanceMetrics: {
          uptime: Math.round(uptime * 100) / 100,
          errorRate: Math.round(errorRate * 100) / 100,
          avgResponseTime: Math.round(averageResponseTime)
        }
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        period
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Error in analytics overview:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})