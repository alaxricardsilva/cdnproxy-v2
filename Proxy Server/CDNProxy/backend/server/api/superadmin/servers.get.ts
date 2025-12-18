import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import os from 'os'
import * as diskusage from 'diskusage'

interface ServerMetrics {
  cpu: number
  memory: number
  disk: number
  uptime: number
  responseTime: number
  lastCheck: string
}

interface Server {
  id: string
  name: string
  hostname: string
  ip_address: string
  region: string
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR'
  type: 'PRIMARY' | 'SECONDARY' | 'CACHE' | 'BACKUP'
  metrics?: ServerMetrics
  created_at: string
  updated_at: string
  notes?: string
}

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

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || ''
    const status = query.status as string || ''
    const region = query.region as string || ''

    // Build servers query
    let serversQuery = supabase
      .from('servers')
      .select('*', { count: 'exact' })

    // Add search filter
    if (search) {
      serversQuery = serversQuery.or(`name.ilike.%${search}%,hostname.ilike.%${search}%,ip_address.ilike.%${search}%`)
    }

    // Add status filter
    if (status) {
      serversQuery = serversQuery.eq('status', status)
    }

    // Add region filter
    if (region) {
      serversQuery = serversQuery.eq('region', region)
    }

    // Add pagination
    const offset = (page - 1) * limit
    serversQuery = serversQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    const { data: servers, error, count } = await serversQuery

    if (error) {
      logger.error('Erro ao buscar servidores:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar servidores'
      })
    }

    // Get current server metrics for comparison
    const currentServerMetrics = await getCurrentServerMetrics()

    // Enrich servers with real-time metrics (for demonstration, we'll simulate some servers)
    const enrichedServers = await Promise.all((servers || []).map(async (server: any) => {
      let metrics: ServerMetrics | undefined

      // If this is the current server, use real metrics
      if (server.hostname === os.hostname() || server.ip_address === 'localhost') {
        metrics = currentServerMetrics
      } else {
        // For other servers, simulate metrics or fetch from monitoring system
        metrics = await getServerMetrics(server.hostname)
      }

      return {
        ...server,
        metrics
      }
    }))

    // If no servers exist in database, create a default entry for current server
    if (!servers || servers.length === 0) {
      const defaultServer = {
        id: 'current-server',
        name: 'Servidor Principal',
        hostname: os.hostname(),
        ip_address: 'localhost',
        region: 'local',
        status: 'ONLINE' as const,
        type: 'PRIMARY' as const,
        metrics: currentServerMetrics,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Servidor atual do sistema'
      }

      // Try to insert the default server into database
      try {
        await supabase
          .from('servers')
          .insert([{
            name: defaultServer.name,
            hostname: defaultServer.hostname,
            ip_address: defaultServer.ip_address,
            region: defaultServer.region,
            status: defaultServer.status,
            type: defaultServer.type,
            notes: defaultServer.notes
          }])
      } catch (insertError) {
        logger.info('Servidor padrão já existe ou erro ao inserir:', insertError)
      }

      return {
        success: true,
        data: [defaultServer],
        pagination: {
          page: 1,
          limit,
          total: 1,
          totalPages: 1
        },
        stats: {
          total: 1,
          online: 1,
          offline: 0,
          maintenance: 0,
          alerts: 0
        }
      }
    }

    // Calculate stats
    const stats = {
      total: count || 0,
      online: enrichedServers.filter(s => s.status === 'ONLINE').length,
      offline: enrichedServers.filter(s => s.status === 'OFFLINE').length,
      maintenance: enrichedServers.filter(s => s.status === 'MAINTENANCE').length,
      alerts: enrichedServers.filter(s => s.metrics && (s.metrics.cpu > 80 || s.metrics.memory > 85)).length
    }

    return {
      success: true,
      data: enrichedServers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    }

  } catch (error: any) {
    logger.error('Erro na API de servidores:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Function to get current server metrics
async function getCurrentServerMetrics(): Promise<ServerMetrics> {
  try {
    // CPU usage
    const cpuUsage = await getCPUUsage()
    
    // Memory usage
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100)
    
    // Disk usage
    const diskInfo = await diskusage.check('/')
    const diskPercentage = Math.round(((diskInfo.total - diskInfo.free) / diskInfo.total) * 100)
    
    // Uptime
    const uptime = Math.floor(os.uptime())
    
    // Response time (simulated)
    const responseTime = Math.random() * 100 + 50
    
    return {
      cpu: Math.round(cpuUsage),
      memory: memoryPercentage,
      disk: diskPercentage,
      uptime,
      responseTime: Math.round(responseTime),
      lastCheck: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Erro ao obter métricas do servidor:', error)
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
      uptime: 0,
      responseTime: 0,
      lastCheck: new Date().toISOString()
    }
  }
}

// Function to get metrics from remote servers (simulated)
async function getServerMetrics(hostname: string): Promise<ServerMetrics> {
  // In a real implementation, this would make HTTP requests to monitoring agents
  // on remote servers or query a centralized monitoring system
  
  // For now, simulate metrics
  return {
    cpu: Math.floor(Math.random() * 80) + 10, // 10-90%
    memory: Math.floor(Math.random() * 70) + 20, // 20-90%
    disk: Math.floor(Math.random() * 60) + 30, // 30-90%
    uptime: Math.floor(Math.random() * 86400 * 30), // 0-30 days in seconds
    responseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
    lastCheck: new Date().toISOString()
  }
}

// Function to get CPU usage
async function getCPUUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startMeasure = cpuAverage()
    
    setTimeout(() => {
      const endMeasure = cpuAverage()
      const idleDifference = endMeasure.idle - startMeasure.idle
      const totalDifference = endMeasure.total - startMeasure.total
      const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference)
      resolve(percentageCPU)
    }, 100)
  })
}

function cpuAverage() {
  const cpus = os.cpus()
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0
  
  for (const cpu of cpus) {
    user += cpu.times.user
    nice += cpu.times.nice
    sys += cpu.times.sys
    idle += cpu.times.idle
    irq += cpu.times.irq
  }
  
  const total = user + nice + sys + idle + irq
  return { idle, total }
}