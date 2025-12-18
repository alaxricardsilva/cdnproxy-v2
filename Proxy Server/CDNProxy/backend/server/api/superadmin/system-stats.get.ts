import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import * as os from 'os'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    // Check if user has superadmin privileges
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    if (!profile || profile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      })
    }

    // Get system statistics
    const [
      { count: totalUsers },
      { count: totalDomains },
      { count: totalRequests },
      serversData
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('domains').select('*', { count: 'exact', head: true }),
      supabase.from('analytics').select('*', { count: 'exact', head: true }),
      supabase.from('servers').select('*')
    ])

    // Get detailed user statistics
    const { data: usersData } = await supabase
      .from('users')
      .select('status, created_at')

    const activeUsers = usersData?.filter(user => user.status === 'ACTIVE').length || 0
    const today = new Date().toISOString().split('T')[0]
    const newUsersToday = usersData?.filter(user => 
      user.created_at && user.created_at.startsWith(today)
    ).length || 0

    // Get detailed domain statistics
    const { data: domainsData } = await supabase
      .from('domains')
      .select('enabled')

    const activeDomains = domainsData?.filter(domain => domain.enabled).length || 0
    const inactiveDomains = (totalDomains || 0) - activeDomains

    // Get request statistics for today and last hour
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const lastHour = new Date(Date.now() - 60 * 60 * 1000)

    const [
      { count: requestsToday },
      { count: requestsLastHour }
    ] = await Promise.all([
      supabase.from('analytics').select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase.from('analytics').select('*', { count: 'exact', head: true })
        .gte('created_at', lastHour.toISOString())
    ])

    // Get system health metrics
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const loadAverage = os.loadavg()
    const uptime = process.uptime()
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()

    // Process servers data
    const servers = serversData?.data || []
    const serverStats = {
      total: servers.length,
      active: servers.filter(server => server.status === 'active').length,
      inactive: servers.filter(server => server.status === 'inactive').length,
      maintenance: servers.filter(server => server.status === 'maintenance').length,
      error: servers.filter(server => server.status === 'error').length,
      by_type: {
        api: servers.filter(server => server.type === 'api').length,
        proxy: servers.filter(server => server.type === 'proxy').length,
        cdn: servers.filter(server => server.type === 'cdn').length,
        database: servers.filter(server => server.type === 'database').length,
        cache: servers.filter(server => server.type === 'cache').length
      }
    }

    const systemStats = {
      users: {
        total: totalUsers || 0,
        active: activeUsers,
        new_today: newUsersToday
      },
      domains: {
        total: totalDomains || 0,
        active: activeDomains,
        inactive: inactiveDomains
      },
      requests: {
        total: totalRequests || 0,
        today: requestsToday || 0,
        last_hour: requestsLastHour || 0
      },
      servers: serverStats,
      system: {
        uptime: Math.floor(uptime),
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          system_total: totalMemory,
          system_free: freeMemory,
          usage_percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpu: {
          load_average: loadAverage,
          usage_user: cpuUsage.user,
          usage_system: cpuUsage.system
        },
        node_version: process.version,
        platform: os.platform(),
        arch: os.arch()
      }
    }

    return {
      success: true,
      data: systemStats,
      timestamp: toSaoPauloISOString()
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