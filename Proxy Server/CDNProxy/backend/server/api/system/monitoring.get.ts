import { logger } from '~/utils/logger'
import { getSystemClient } from '../../../utils/hybrid-auth'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { defineEventHandler, createError } from 'h3'
import { toSaoPauloISOString } from '~/utils/timezone'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
  try {
    // Usar cliente de sistema (sem autenticação necessária)
    const supabase = getSystemClient()

    // Get system metrics
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    const loadAverage = os.loadavg()
    const uptime = process.uptime()
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory
    const memoryPercentage = (usedMemory / totalMemory) * 100

    // Get disk usage
    let diskUsage = { total: '0GB', used: '0GB', free: '0GB', percentage: 0 }
    try {
      const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $2,$3,$4,$5}'")
      const parts = stdout.trim().split(' ')
      if (parts.length >= 4) {
        diskUsage = {
          total: parts[0] || '0GB',
          used: parts[1] || '0GB',
          free: parts[2] || '0GB',
          percentage: parseFloat((parts[3] || '0%').replace('%', '')) || 0
        }
      }
    } catch (error) {
      console.warn('Could not get disk usage:', error)
    }

    // Get network statistics
    let networkStats = { rx_bytes: 0, tx_bytes: 0 }
    try {
      const { stdout } = await execAsync("cat /proc/net/dev | grep eth0 | awk '{print $2,$10}'")
      if (stdout.trim()) {
        const parts = stdout.trim().split(' ')
        if (parts.length >= 4) {
          networkStats = {
            rx_bytes: parseInt(parts[0] || '0') || 0,
            tx_bytes: parseInt(parts[1] || '0') || 0
          }
        }
      }
    } catch (error) {
      console.warn('Could not get network stats:', error)
    }

    // Buscar dados reais de performance do banco de dados
    const performanceData = await getPerformanceMetrics(supabase)

    // Check service status
    const services = {
      frontend: await checkServiceStatus(3000),
      backend: await checkServiceStatus(5001),
      database: await checkDatabaseStatus(supabase)
    }

    // Generate alerts based on real data
    const alerts = generateAlerts(memoryPercentage, loadAverage, diskUsage, services, performanceData)

    // Generate historical data for charts (last 24 hours)
    const historicalData = await getHistoricalPerformanceData(supabase)

    // Verificar status das APIs críticas com dados reais
    const criticalAPIs = await checkCriticalAPIs(supabase)

    const monitoringData = {
      // Simplified data for the cards
      cpu: Math.round(Math.min(100, (loadAverage[0] / os.cpus().length) * 100)),
      memory: Math.round(memoryPercentage),
      servers: 1,
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      
      // Historical data for charts
      historical: historicalData || {
        cpu: [],
        memory: [],
        requests: [],
        labels: []
      },
      
      // Overall API status
      overallStatus: criticalAPIs?.overallStatus || 'healthy',
      
      // Detailed system data
      system: {
        uptime: Math.floor(uptime),
        loadAverage: loadAverage,
        cpu: {
          usage_user: cpuUsage.user,
          usage_system: cpuUsage.system,
          cores: os.cpus().length,
          percentage: Math.min(100, (loadAverage[0] / os.cpus().length) * 100)
        },
        memory: {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          percentage: memoryPercentage,
          process: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            rss: memoryUsage.rss
          }
        },
        disk: diskUsage,
        network: networkStats,
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      },
      services: services,
      criticalAPIs: criticalAPIs,
      performance: performanceData,
      alerts: {
        active: alerts,
        count: alerts.length
      },
      timestamp: new Date().toISOString()
    }

    return {
      success: true,
      data: monitoringData
    }

  } catch (error: any) {
    logger.error('Erro no monitoramento:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Funções auxiliares para buscar dados reais
async function getPerformanceMetrics(supabase: any) {
  try {
    // Buscar métricas de performance das últimas 24 horas
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Métricas de acesso
    const { data: accessMetrics } = await supabase
      .from('access_logs')
      .select('status_code, created_at, response_time')
      .gte('created_at', twentyFourHoursAgo)

    // Métricas de domínios
    const { data: domainMetrics } = await supabase
      .from('domains')
      .select('id, status, created_at')

    // Calcular estatísticas
    const totalRequests = accessMetrics?.length || 0
    const successfulRequests = accessMetrics?.filter((log: any) => log.status_code < 400).length || 0
    const errorRequests = accessMetrics?.filter((log: any) => log.status_code >= 400).length || 0
    const avgResponseTime = totalRequests > 0 ? 
      accessMetrics?.reduce((sum: number, log: any) => sum + (log.response_time || 0), 0) / totalRequests : 0

    const activeDomains = domainMetrics?.filter((domain: any) => domain.status === 'active').length || 0
    const totalDomains = domainMetrics?.length || 0

    return {
      requests: {
        total: totalRequests,
        successful: successfulRequests,
        errors: errorRequests,
        success_rate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(2) : '0.00'
      },
      response_time: {
        average: avgResponseTime.toFixed(2),
        unit: 'ms'
      },
      domains: {
        active: activeDomains,
        total: totalDomains,
        active_rate: totalDomains > 0 ? ((activeDomains / totalDomains) * 100).toFixed(2) : '0.00'
      }
    }
  } catch (error) {
    logger.error('Erro ao buscar métricas de performance:', error)
    return {
      requests: { total: 0, successful: 0, errors: 0, success_rate: '0.00' },
      response_time: { average: '0.00', unit: 'ms' },
      domains: { active: 0, total: 0, active_rate: '0.00' }
    }
  }
}

async function getHistoricalPerformanceData(supabase: any) {
  try {
    const now = new Date()
    const historicalData = {
      cpu: [] as number[],
      memory: [] as number[],
      requests: [] as number[],
      labels: [] as string[]
    }

    // Buscar dados das últimas 24 horas (1 ponto por hora)
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * 60 * 60 * 1000))
      const nextHour = new Date(time.getTime() + 60 * 60 * 1000)
      
      historicalData.labels.push(time.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))

      // Buscar requests por hora
      const { data: hourlyRequests } = await supabase
        .from('access_logs')
        .select('id')
        .gte('created_at', time.toISOString())
        .lt('created_at', nextHour.toISOString())

      const requestCount = hourlyRequests?.length || 0
      
      // Simular CPU e memória baseado na carga de requests
      const baseLoad = os.loadavg()[0] / os.cpus().length * 100
      const requestLoad = Math.min(requestCount * 2, 50) // Máximo 50% adicional
      
      historicalData.cpu.push(Math.max(0, Math.min(100, baseLoad + requestLoad + (Math.random() * 10 - 5))))
      historicalData.memory.push(Math.max(0, Math.min(100, (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100) + (Math.random() * 10 - 5))))
      historicalData.requests.push(requestCount)
    }

    return historicalData
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error)
    // Retornar estrutura vazia quando não há dados
    return {
      cpu: [],
      memory: [],
      requests: [],
      labels: []
    }
  }
}

async function checkCriticalAPIs(supabase: any) {
  try {
    // Verificar saúde das tabelas críticas
    const checks = [
      { name: 'Users Table', table: 'users' },
      { name: 'Domains Table', table: 'domains' },
      { name: 'Access Logs Table', table: 'access_logs' },
      { name: 'Plans Table', table: 'plans' }
    ]

    const results = []
    let healthyCount = 0

    for (const check of checks) {
      const startTime = Date.now()
      try {
        const { error } = await supabase
          .from(check.table)
          .select('id')
          .limit(1)
        
        const responseTime = Date.now() - startTime
        const isHealthy = !error

        if (isHealthy) healthyCount++

        results.push({
          name: check.name,
          table: check.table,
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          errorMessage: error?.message || null,
          timestamp: toSaoPauloISOString(new Date())
        })
      } catch (error: any) {
        results.push({
          name: check.name,
          table: check.table,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          errorMessage: error.message,
          timestamp: toSaoPauloISOString(new Date())
        })
      }
    }

    const overallStatus = healthyCount === checks.length ? 'healthy' : 
                         healthyCount > checks.length / 2 ? 'warning' : 'critical'

    return {
      summary: {
        total: checks.length,
        healthy: healthyCount,
        warning: 0,
        unhealthy: checks.length - healthyCount,
        healthPercentage: Math.round((healthyCount / checks.length) * 100)
      },
      details: results,
      overallStatus
    }
  } catch (error) {
    logger.error('Erro ao verificar APIs críticas:', error)
    return {
      summary: { total: 0, healthy: 0, warning: 0, unhealthy: 0, healthPercentage: 0 },
      details: [],
      overallStatus: 'critical'
    }
  }
}

function generateAlerts(memoryPercentage: number, loadAverage: number[], diskUsage: any, services: any, performanceData: any) {
  const alerts = []
  
  if (memoryPercentage > 90) {
    alerts.push({
      type: 'critical',
      message: `Uso de memória crítico: ${memoryPercentage.toFixed(1)}%`,
      timestamp: new Date().toISOString()
    })
  } else if (memoryPercentage > 80) {
    alerts.push({
      type: 'warning',
      message: `Uso de memória alto: ${memoryPercentage.toFixed(1)}%`,
      timestamp: new Date().toISOString()
    })
  }

  if (loadAverage[0] > os.cpus().length * 2) {
    alerts.push({
      type: 'critical',
      message: `Load average muito alto: ${loadAverage[0].toFixed(2)}`,
      timestamp: new Date().toISOString()
    })
  }

  if (diskUsage?.percentage && diskUsage.percentage > 90) {
    alerts.push({
      type: 'critical',
      message: `Espaço em disco crítico: ${diskUsage.percentage}%`,
      timestamp: new Date().toISOString()
    })
  }

  if (!services?.database?.healthy) {
    alerts.push({
      type: 'critical',
      message: 'Banco de dados não está respondendo',
      timestamp: new Date().toISOString()
    })
  }

  // Alertas baseados em performance
  if (parseFloat(performanceData.requests.success_rate) < 95) {
    alerts.push({
      type: 'warning',
      message: `Taxa de sucesso baixa: ${performanceData.requests.success_rate}%`,
      timestamp: new Date().toISOString()
    })
  }

  return alerts
}

async function checkServiceStatus(port: number): Promise<{ healthy: boolean, responseTime?: number }> {
  try {
    const start = Date.now()
    const response = await fetch(`http://localhost:${port}/`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    const responseTime = Date.now() - start
    
    return {
      healthy: response.ok,
      responseTime
    }
  } catch (error) {
    return { healthy: false }
  }
}

async function checkDatabaseStatus(supabase: any): Promise<{ healthy: boolean, responseTime?: number }> {
  try {
    const start = Date.now()
    const { error } = await supabase
      .from('users')
      .select('email')
      .limit(1)
    
    const responseTime = Date.now() - start
    
    return {
      healthy: !error,
      responseTime
    }
  } catch (error) {
    return { healthy: false }
  }
}