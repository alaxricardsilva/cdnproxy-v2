import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    
    // Get query parameters
    const query = getQuery(event)
    const period = query.period as string || '7d'
    const type = query.type as string || 'overview'

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '24h':
        startDate.setHours(endDate.getHours() - 24)
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

    let reportData: any = {}

    if (type === 'overview' || type === 'all') {
      // Get overview statistics
      const [
        { data: analytics },
        { data: users },
        { data: domains },
        { data: accessLogs }
      ] = await Promise.all([
        supabase
          .from('analytics')
          .select('*')
          .gte('created_at', toSaoPauloISOString(startDate))
          .lte('created_at', toSaoPauloISOString(endDate)),
        supabase
          .from('users')
          .select('*')
          .gte('created_at', toSaoPauloISOString(startDate))
          .lte('created_at', toSaoPauloISOString(endDate)),
        supabase
          .from('domains')
          .select('*'),
        supabase
          .from('access_logs')
          .select('*')
          .gte('timestamp', toSaoPauloISOString(startDate))
          .lte('timestamp', toSaoPauloISOString(endDate))
      ])

      reportData = {
        ...reportData,
        overview: {
          totalRequests: analytics?.length || 0,
          totalBandwidth: analytics?.reduce((sum, record) => sum + (record.bytes || 0), 0) || 0,
          newUsers: users?.length || 0,
          totalDomains: domains?.length || 0,
          activeUsers: users?.filter(u => u.status === 'ACTIVE').length || 0,
          activeDomains: domains?.filter(d => d.enabled).length || 0,
          totalAccessLogs: accessLogs?.length || 0
        }
      }
    }

    if (type === 'traffic' || type === 'all') {
      // Get traffic statistics
      const { data: trafficData } = await supabase
        .from('analytics')
        .select('*')
        .gte('created_at', toSaoPauloISOString(startDate))
        .lte('created_at', toSaoPauloISOString(endDate))

      const trafficByDay: any = {}
      const trafficByCountry: any = {}
      const trafficByDomain: any = {}

      trafficData?.forEach(record => {
        const day = new Date(record.created_at).toISOString().split('T')[0]
        const country = record.country || 'Unknown'
        const domain = record.domain || 'Unknown'

        trafficByDay[day] = (trafficByDay[day] || 0) + (record.bytes || 0)
        trafficByCountry[country] = (trafficByCountry[country] || 0) + (record.bytes || 0)
        trafficByDomain[domain] = (trafficByDomain[domain] || 0) + (record.bytes || 0)
      })

      reportData = {
        ...reportData,
        traffic: {
          byDay: Object.entries(trafficByDay).map(([date, bytes]) => ({ date, bytes })),
          byCountry: Object.entries(trafficByCountry)
            .map(([country, bytes]) => ({ country, bytes }))
            .sort((a, b) => b.bytes - a.bytes)
            .slice(0, 10),
          byDomain: Object.entries(trafficByDomain)
            .map(([domain, bytes]) => ({ domain, bytes }))
            .sort((a, b) => b.bytes - a.bytes)
            .slice(0, 10)
        }
      }
    }

    if (type === 'users' || type === 'all') {
      // Get user statistics
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')

      const usersByRole: any = {}
      const usersByStatus: any = {}
      const usersByMonth: any = {}

      allUsers?.forEach(user => {
        const role = user.role || 'USER'
        const status = user.status || 'ACTIVE'
        const month = new Date(user.created_at).toISOString().substring(0, 7)

        usersByRole[role] = (usersByRole[role] || 0) + 1
        usersByStatus[status] = (usersByStatus[status] || 0) + 1
        usersByMonth[month] = (usersByMonth[month] || 0) + 1
      })

      reportData = {
        ...reportData,
        users: {
          byRole: Object.entries(usersByRole).map(([role, count]) => ({ role, count })),
          byStatus: Object.entries(usersByStatus).map(([status, count]) => ({ status, count })),
          byMonth: Object.entries(usersByMonth).map(([month, count]) => ({ month, count }))
        }
      }
    }

    // Se não há dados reais, retornar dados simulados para demonstração
    // Se não há dados suficientes, retornar estrutura vazia em vez de dados simulados
    if (Object.keys(reportData).length === 0 || 
        (reportData.overview && reportData.overview.totalRequests === 0)) {
      
      return {
        success: true,
        data: reportData,
        period,
        type,
        dateRange: {
          start: toSaoPauloISOString(startDate),
          end: toSaoPauloISOString(endDate)
        },
        message: 'Nenhum dado encontrado para o período selecionado'
      }
    }

    return {
      success: true,
      data: reportData,
      period,
      type,
      dateRange: {
        start: toSaoPauloISOString(startDate),
        end: toSaoPauloISOString(endDate)
      }
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})