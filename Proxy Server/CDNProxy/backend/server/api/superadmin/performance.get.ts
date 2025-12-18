import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireSuperAdmin } from '../../../utils/supabase-auth'
import * as os from 'os'
import * as fs from 'fs'
import { promisify } from 'util'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { createClient } from '@supabase/supabase-js'
import * as diskusage from 'diskusage'

const stat = promisify(fs.stat)

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    
    // Get query parameters
    const query = getQuery(event)
    const serverId = query.server_id as string
    
    // Get servers data
    const { data: servers } = await supabase
      .from('servers')
      .select('*')
      .order('created_at', { ascending: false })

    // If specific server requested, filter to that server
    let targetServers = servers || []
    if (serverId) {
      targetServers = servers?.filter(server => server.id === serverId) || []
    }

    // Collect performance data for all servers
    const performanceData = await Promise.all(
      targetServers.map(async (server) => {
        // For current server, get real metrics
        if (server.hostname === os.hostname() || server.ip_address === 'localhost') {
          const cpuUsage = await getCPUUsage()
          const memoryUsage = getMemoryUsage()
          const diskUsage = await getDiskUsage()
          const responseTime = await getAverageResponseTime()
          const uptime = getUptime()
          const historicalData = await getHistoricalPerformanceData()

          return {
            server: {
              id: server.id,
              name: server.name,
              hostname: server.hostname,
              ip_address: server.ip_address,
              type: server.type,
              status: server.status
            },
            metrics: {
              cpu: Math.round(cpuUsage),
              memory: Math.round(memoryUsage.percentage),
              responseTime: Math.round(responseTime),
              uptime: uptime,
              disk: Math.round(diskUsage.percentage)
            },
            systemInfo: {
              os: `${os.type()} ${os.release()}`,
              nodeVersion: process.version,
              totalMemory: formatBytes(os.totalmem()),
              diskSpace: diskUsage.total,
              loadAverage: os.loadavg().map(avg => avg.toFixed(2)).join(', '),
              lastReboot: formatUptime(os.uptime())
            },
            charts: {
              cpuMemory: {
                labels: historicalData.labels,
                datasets: [
                  {
                    label: 'CPU (%)',
                    data: historicalData.cpu,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                  },
                  {
                    label: 'Memória (%)',
                    data: historicalData.memory,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                  }
                ]
              },
              responseTime: {
                labels: historicalData.labels,
                datasets: [
                  {
                    label: 'Tempo de Resposta (ms)',
                    data: historicalData.responseTime,
                    borderColor: 'rgb(251, 191, 36)',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    tension: 0.4
                  }
                ]
              }
            }
          }
        } else {
          // For remote servers, simulate or fetch from monitoring system
          return {
            server: {
              id: server.id,
              name: server.name,
              hostname: server.hostname,
              ip_address: server.ip_address,
              type: server.type,
              status: server.status
            },
            metrics: {
              cpu: Math.floor(Math.random() * 100),
              memory: Math.floor(Math.random() * 100),
              responseTime: Math.floor(Math.random() * 500) + 50,
              uptime: '99.9%',
              disk: Math.floor(Math.random() * 100)
            },
            systemInfo: {
              os: 'Linux Ubuntu 20.04',
              nodeVersion: 'v18.17.0',
              totalMemory: '8 GB',
              diskSpace: '100 GB',
              loadAverage: '0.5, 0.3, 0.2',
              lastReboot: '30 dias atrás'
            },
            charts: {
              cpuMemory: {
                labels: Array.from({length: 24}, (_, i) => `${23-i}h`),
                datasets: [
                  {
                    label: 'CPU (%)',
                    data: Array.from({length: 24}, () => Math.floor(Math.random() * 100)),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                  },
                  {
                    label: 'Memória (%)',
                    data: Array.from({length: 24}, () => Math.floor(Math.random() * 100)),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                  }
                ]
              },
              responseTime: {
                labels: Array.from({length: 24}, (_, i) => `${23-i}h`),
                datasets: [
                  {
                    label: 'Tempo de Resposta (ms)',
                    data: Array.from({length: 24}, () => Math.floor(Math.random() * 500) + 50),
                    borderColor: 'rgb(251, 191, 36)',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    tension: 0.4
                  }
                ]
              }
            }
          }
        }
      })
    )

    // If no servers found, create default current server data
    if (performanceData.length === 0) {
      const cpuUsage = await getCPUUsage()
      const memoryUsage = getMemoryUsage()
      const diskUsage = await getDiskUsage()
      const responseTime = await getAverageResponseTime()
      const uptime = getUptime()
      const historicalData = await getHistoricalPerformanceData()

      performanceData.push({
        server: {
          id: 'current-server',
          name: 'Servidor Principal',
          hostname: os.hostname(),
          ip_address: 'localhost',
          type: 'api',
          status: 'active'
        },
        metrics: {
          cpu: Math.round(cpuUsage),
          memory: Math.round(memoryUsage.percentage),
          responseTime: Math.round(responseTime),
          uptime: uptime,
          disk: Math.round(diskUsage.percentage)
        },
        systemInfo: {
          os: `${os.type()} ${os.release()}`,
          nodeVersion: process.version,
          totalMemory: formatBytes(os.totalmem()),
          diskSpace: diskUsage.total,
          loadAverage: os.loadavg().map(avg => avg.toFixed(2)).join(', '),
          lastReboot: formatUptime(os.uptime())
        },
        charts: {
          cpuMemory: {
            labels: historicalData.labels,
            datasets: [
              {
                label: 'CPU (%)',
                data: historicalData.cpu,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4
              },
              {
                label: 'Memória (%)',
                data: historicalData.memory,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
              }
            ]
          },
          responseTime: {
            labels: historicalData.labels,
            datasets: [
              {
                label: 'Tempo de Resposta (ms)',
                data: historicalData.responseTime,
                borderColor: 'rgb(251, 191, 36)',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                tension: 0.4
              }
            ]
          }
        }
      })
    }

    // Calculate aggregate metrics for all servers
    const aggregateMetrics = {
      avgCpu: Math.round(performanceData.reduce((sum, data) => sum + data.metrics.cpu, 0) / performanceData.length),
      avgMemory: Math.round(performanceData.reduce((sum, data) => sum + data.metrics.memory, 0) / performanceData.length),
      avgResponseTime: Math.round(performanceData.reduce((sum, data) => sum + data.metrics.responseTime, 0) / performanceData.length),
      totalServers: performanceData.length,
      healthyServers: performanceData.filter(data => data.server.status === 'active').length
    }

    return {
      success: true,
      data: {
        servers: performanceData,
        aggregate: aggregateMetrics,
        // For backward compatibility, include single server data if only one server
        ...(performanceData.length === 1 ? performanceData[0] : {})
      }
    }
  } catch (error: any) {
    logger.error('Erro na API de performance:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})

// Função para obter uso de CPU
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
  
  for (let cpu of cpus) {
    user += cpu.times.user
    nice += cpu.times.nice
    sys += cpu.times.sys
    idle += cpu.times.idle
    irq += cpu.times.irq
  }
  
  const total = user + nice + sys + idle + irq
  return { idle, total }
}

// Função para obter uso de memória
function getMemoryUsage() {
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const percentage = (usedMemory / totalMemory) * 100
  
  return {
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    percentage
  }
}

// Função para obter uso de disco
async function getDiskUsage() {
  try {
    // Obter informações reais de espaço em disco
    const diskInfo = await diskusage.check('/')
    
    const totalGB = Math.round(diskInfo.total / (1024 * 1024 * 1024))
    const freeGB = Math.round(diskInfo.free / (1024 * 1024 * 1024))
    const usedGB = totalGB - freeGB
    const percentage = Math.round((usedGB / totalGB) * 100)
    
    return {
      total: `${totalGB} GB`,
      used: `${usedGB} GB`,
      free: `${freeGB} GB`,
      percentage
    }
  } catch (error: any) {
    logger.error('Erro ao obter informações de disco:', error)
    return {
      total: 'N/A',
      used: 'N/A',
      free: 'N/A',
      percentage: 0
    }
  }
}

// Função para obter informações do sistema
function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    networkInterfaces: Object.keys(os.networkInterfaces()).length
  }
}

// Função para obter tempo médio de resposta
async function getAverageResponseTime(): Promise<number> {
  // Simulação - em produção, coletar de logs ou métricas reais
  const baseTime = 50
  const variation = Math.random() * 100
  return baseTime + variation
}

// Função para obter uptime formatado
function getUptime(): string {
  const uptimeSeconds = os.uptime()
  return formatUptime(uptimeSeconds)
}

// Função para formatar uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  return `${days}d ${hours}h ${minutes}m`
}

// Função para formatar bytes
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

// Função para obter dados históricos reais do banco de dados
async function getHistoricalPerformanceData() {
  try {
    // Inicializar cliente Supabase
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.warn('Supabase não configurado, retornando dados vazios')
      return {
        labels: [],
        cpu: [],
        memory: [],
        responseTime: []
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)) // Últimas 24 horas

    // Buscar logs de performance do sistema (se existir tabela system_metrics)
    const { data: performanceData, error } = await supabase
      .from('system_metrics')
      .select('created_at, cpu_usage, memory_usage, response_time')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })

    if (error || !performanceData || performanceData.length === 0) {
      logger.warn('Tabela system_metrics não encontrada ou vazia, retornando dados vazios')
      return {
        labels: [],
        cpu: [],
        memory: [],
        responseTime: []
      }
    }

    // Agrupar dados por hora
    const hourlyData = new Map()

    performanceData.forEach(metric => {
      const hour = new Date(metric.created_at).getHours()
      const key = `${new Date(metric.created_at).toDateString()}-${hour}`
      
      if (!hourlyData.has(key)) {
        hourlyData.set(key, {
          timestamp: new Date(metric.created_at),
          cpu: [],
          memory: [],
          responseTime: []
        })
      }
      
      const data = hourlyData.get(key)
      if (metric.cpu_usage) data.cpu.push(metric.cpu_usage)
      if (metric.memory_usage) data.memory.push(metric.memory_usage)
      if (metric.response_time) data.responseTime.push(metric.response_time)
    })

    // Converter para arrays ordenados
    const sortedData = Array.from(hourlyData.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    const labels: string[] = []
    const cpu: number[] = []
    const memory: number[] = []
    const responseTime: number[] = []

    sortedData.forEach(data => {
       labels.push(data.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
       cpu.push(data.cpu.length > 0 ? Math.round(data.cpu.reduce((a: number, b: number) => a + b) / data.cpu.length) : 0)
       memory.push(data.memory.length > 0 ? Math.round(data.memory.reduce((a: number, b: number) => a + b) / data.memory.length) : 0)
       responseTime.push(data.responseTime.length > 0 ? Math.round(data.responseTime.reduce((a: number, b: number) => a + b) / data.responseTime.length) : 0)
     })

    return { labels, cpu, memory, responseTime }

  } catch (error) {
    logger.error('Erro ao buscar dados históricos:', error)
    return {
      labels: [],
      cpu: [],
      memory: [],
      responseTime: []
    }
  }
}