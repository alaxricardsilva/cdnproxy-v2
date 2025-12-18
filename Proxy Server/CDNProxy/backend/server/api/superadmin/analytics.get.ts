import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireSuperAdmin } from '../../../utils/supabase-auth'
import { getSystemClient } from '../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Get system client for analytics data
    const supabase = getSystemClient()

    // Parâmetros de consulta
    const query = getQuery(event)
    const period = query.period as string || '7d'

    // Calcular datas baseadas no período
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 7 * 60 * 60 * 1000)
    }

    // Buscar dados reais de analytics
    const [
      domainsResult,
      usersResult,
      transactionsResult,
      allDomainsResult,
      allUsersResult,
      accessLogsResult,
      analyticsDataResult
    ] = await Promise.all([
      // Domínios criados no período
      supabase
        .from('domains')
        .select('id, created_at, active')
        .gte('created_at', toSaoPauloISOString(startDate)),
      
      // Usuários criados no período
      supabase
        .from('users')
        .select('id, created_at, role')
        .gte('created_at', toSaoPauloISOString(startDate)),
      
      // Transações no período
      supabase
        .from('transactions')
        .select('id, created_at, status, amount')
        .gte('created_at', toSaoPauloISOString(startDate)),

      // Total de domínios (para calcular visualizações baseadas em dados reais)
      supabase
        .from('domains')
        .select('id, active')
        .eq('active', true),

      // Total de usuários únicos
      supabase
        .from('users')
        .select('id'),

      // Logs de acesso para métricas reais
      supabase
        .from('access_logs')
        .select('id, domain, client_ip, user_agent, country, created_at')
        .gte('created_at', toSaoPauloISOString(startDate))
        .limit(1000),

      // Dados de analytics processados
      supabase
        .from('analytics_data')
        .select('total_requests, unique_visitors, total_bandwidth, countries, user_agents, date')
        .gte('date', toSaoPauloISOString(startDate).split('T')[0])
    ])

    if (domainsResult.error) throw domainsResult.error
    if (usersResult.error) throw usersResult.error
    if (transactionsResult.error) throw transactionsResult.error
    if (allDomainsResult.error) throw allDomainsResult.error
    if (allUsersResult.error) throw allUsersResult.error
    // Não falhar se access_logs ou analytics_data não existirem
    if (accessLogsResult.error) console.warn('Access logs não encontrados:', accessLogsResult.error.message)
    if (analyticsDataResult.error) console.warn('Analytics data não encontrados:', analyticsDataResult.error.message)

    const domains = domainsResult.data || []
    const users = usersResult.data || []
    const transactions = transactionsResult.data || []
    const allDomains = allDomainsResult.data || []
    const allUsers = allUsersResult.data || []
    const accessLogs = accessLogsResult.data || []
    const analyticsData = analyticsDataResult.data || []

    // Calcular métricas reais baseadas nos dados do banco
    const totalRequests = analyticsData.reduce((sum, item) => sum + (item.total_requests || 0), 0) || accessLogs.length
    const totalUniqueVisitors = analyticsData.reduce((sum, item) => sum + (item.unique_visitors || 0), 0) || 
                               new Set(accessLogs.map(log => log.client_ip)).size
    const pageViews = totalRequests
    const uniqueUsers = totalUniqueVisitors
    const avgSessionTime = '0m 0s' // Sem dados suficientes para calcular
    const completedTransactions = transactions.filter(t => t.status === 'completed').length
    const conversionRate = users.length > 0 ? (completedTransactions / users.length * 100).toFixed(1) : '0.0'

    // Estatísticas de dispositivos baseadas em user agents reais
    const deviceStats: Array<{
      device: string
      percentage: number
      users: number
      color: string
    }> = []
    if (accessLogs.length > 0) {
      const userAgents = accessLogs.map(log => log.user_agent).filter(Boolean)
      const deviceCounts: Record<string, number> = {}
      
      userAgents.forEach(ua => {
        if (ua && typeof ua === 'string') {
          if (ua.includes('SmartTV') || ua.includes('Smart-TV') || ua.includes('SMART-TV') || 
              ua.includes('WebOS') || ua.includes('Tizen') || ua.includes('BRAVIA') || 
              ua.includes('NetCast') || ua.includes('GoogleTV') || ua.includes('AndroidTV') ||
              ua.includes('AppleTV') || ua.includes('RokuOS') || ua.includes('FireTV')) {
            deviceCounts['SmartTV'] = (deviceCounts['SmartTV'] || 0) + 1
          } else if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
            deviceCounts['Mobile'] = (deviceCounts['Mobile'] || 0) + 1
          } else if (ua.includes('Tablet') || ua.includes('iPad')) {
            deviceCounts['Tablet'] = (deviceCounts['Tablet'] || 0) + 1
          } else {
            deviceCounts['Desktop'] = (deviceCounts['Desktop'] || 0) + 1
          }
        }
      })

      Object.entries(deviceCounts).forEach(([device, count]) => {
        const percentage = ((count as number) / userAgents.length * 100).toFixed(1)
        deviceStats.push({
          device,
          percentage: parseFloat(percentage),
          users: count,
          color: device === 'Mobile' ? 'blue' : device === 'Tablet' ? 'green' : device === 'SmartTV' ? 'red' : 'purple'
        })
      })
    }

    // Top países baseados em dados reais
    const topCountries: Array<{
      country: string
      visitors: number
      flag: string
    }> = []
    if (accessLogs.length > 0) {
      const countryCounts: Record<string, number> = {}
      accessLogs.forEach(log => {
        if (log.country && typeof log.country === 'string') {
          countryCounts[log.country] = (countryCounts[log.country] || 0) + 1
        }
      })

      Object.entries(countryCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .forEach(([country, count]) => {
          topCountries.push({
            country,
            visitors: count as number,
            flag: '🌍' // Placeholder - pode ser melhorado com flags reais
          })
        })
    }

    // Atividade recente baseada apenas em dados reais
    const recentActivity = [
      ...users.slice(0, 5).map((user) => ({
        id: `user_${user.id}`,
        user: `Usuário ${user.id ? user.id.toString().slice(0, 8) : 'N/A'}`,
        page: '/dashboard',
        location: 'N/A',
        flag: '',
        device: 'N/A',
        time: user.created_at ? new Date(user.created_at).toLocaleTimeString('pt-BR') : 'N/A'
      })),
      ...domains.slice(0, 5).map((domain) => ({
        id: `domain_${domain.id}`,
        user: `Admin ${domain.id ? domain.id.toString().slice(0, 8) : 'N/A'}`,
        page: '/admin/domains',
        location: 'N/A',
        flag: '',
        device: 'N/A',
        time: domain.created_at ? new Date(domain.created_at).toLocaleTimeString('pt-BR') : 'N/A'
      }))
    ].slice(0, 10)

    // Tráfego por hora baseado em dados reais
    const hourlyTraffic: Array<{
      hour: string
      requests: number
    }> = []
    
    if (accessLogs.length > 0) {
      const hourCounts: Record<string, number> = {}
      
      accessLogs.forEach(log => {
        if (log.created_at) {
          try {
            const date = new Date(log.created_at)
            if (!isNaN(date.getTime())) {
              const hour = date.getHours()
              if (typeof hour === 'number' && hour >= 0 && hour <= 23) {
                const hourKey = `${hour.toString().padStart(2, '0')}:00`
                hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1
              }
            }
          } catch (e) {
            console.warn('Erro ao processar data do log:', log.created_at, e)
          }
        }
      })

      // Preencher todas as 24 horas
      for (let i = 0; i < 24; i++) {
        const hourKey = `${i.toString().padStart(2, '0')}:00`
        hourlyTraffic.push({
          hour: hourKey,
          requests: hourCounts[hourKey] || 0
        })
      }
    } else {
      // Sem dados reais disponíveis
      for (let i = 0; i < 24; i++) {
        const hourKey = `${i.toString().padStart(2, '0')}:00`
        hourlyTraffic.push({
          hour: hourKey,
          requests: 0
        })
      }
    }

    return {
      success: true,
      data: {
        metrics: {
          pageViews,
          uniqueUsers,
          avgSessionTime,
          conversionRate: parseFloat(conversionRate)
        },
        deviceStats,
        topCountries,
        recentActivity,
        hourlyTraffic,
        // Adicionar dados de tráfego no formato esperado pelo frontend
        trafficChart: {
          data: hourlyTraffic.map(item => item.requests),
          labels: hourlyTraffic.map(item => item.hour)
        },
        period,
        dateRange: {
          start: toSaoPauloISOString(startDate),
          end: toSaoPauloISOString(now)
        },
        // Dados adicionais para debug
        rawData: {
          domainsInPeriod: domains.length,
          usersInPeriod: users.length,
          transactionsInPeriod: transactions.length,
          totalDomains: allDomains.length,
          totalUsers: allUsers.length,
          completedTransactions,
          activeDomains: domains?.filter(d => d.active).length || 0
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro ao buscar dados de analytics:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})