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

    // If no domains, return empty bandwidth data
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          totalBandwidth: 0,
          averageBandwidth: 0,
          peakBandwidth: 0,
          bandwidthByDomain: [],
          timeline: [],
          bandwidthByType: {
            html: 0,
            css: 0,
            js: 0,
            images: 0,
            other: 0
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

    // Calculate bandwidth metrics
    const totalBandwidth = logs.reduce((sum, log) => sum + (log.bytes_sent || 0), 0)
    const averageBandwidth = logs.length > 0 ? totalBandwidth / logs.length : 0
    const peakBandwidth = Math.max(...logs.map(log => log.bytes_sent || 0), 0)

    // Calculate bandwidth by domain
    const bandwidthByDomain: Record<string, number> = {}
    logs.forEach(log => {
      const domainRecord = userDomains?.find(d => d.id === log.domain_id)
      if (domainRecord) {
        if (!bandwidthByDomain[domainRecord.domain]) {
          bandwidthByDomain[domainRecord.domain] = 0
        }
        bandwidthByDomain[domainRecord.domain] += log.bytes_sent || 0
      }
    })

    const bandwidthByDomainArray = Object.entries(bandwidthByDomain)
      .map(([domain, bandwidth]) => ({ domain, bandwidth: bandwidth as number }))
      .sort((a, b) => b.bandwidth - a.bandwidth)

    // Calculate bandwidth by file type
    const bandwidthByType = {
      html: 0,
      css: 0,
      js: 0,
      images: 0,
      other: 0
    }

    logs.forEach(log => {
      const path = log.path || ''
      const bytes = log.bytes_sent || 0
      
      if (path.endsWith('.html') || path === '/' || !path.includes('.')) {
        bandwidthByType.html += bytes
      } else if (path.endsWith('.css')) {
        bandwidthByType.css += bytes
      } else if (path.endsWith('.js')) {
        bandwidthByType.js += bytes
      } else if (path.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i)) {
        bandwidthByType.images += bytes
      } else {
        bandwidthByType.other += bytes
      }
    })

    // Generate timeline data (hourly for 1d, daily for others)
    const timeline = generateBandwidthTimeline(logs, startDate, endDate, period)

    return {
      success: true,
      data: {
        totalBandwidth,
        averageBandwidth: Math.round(averageBandwidth),
        peakBandwidth,
        bandwidthByDomain: bandwidthByDomainArray,
        timeline,
        bandwidthByType
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        period
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Error in analytics bandwidth:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

function generateBandwidthTimeline(logs: any[], startDate: Date, endDate: Date, period: string) {
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
      
      const bandwidth = hourLogs.reduce((sum, log) => sum + (log.bytes_sent || 0), 0)
      
      timeline.push({
        timestamp: hourStart.toISOString(),
        bandwidth,
        requests: hourLogs.length
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
      
      const bandwidth = dayLogs.reduce((sum, log) => sum + (log.bytes_sent || 0), 0)
      
      timeline.push({
        timestamp: dayStart.toISOString(),
        bandwidth,
        requests: dayLogs.length
      })
    }
  }
  
  return timeline
}