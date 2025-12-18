import { logger } from '~/utils/logger'
import { defineEventHandler, setResponseHeader } from 'h3'
import { getRedisClient } from '~/utils/redis'
import { createClient } from '@supabase/supabase-js'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  // Definir explicitamente o tipo de conteúdo como JSON
  setResponseHeader(event, 'Content-Type', 'application/json')
  
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: toSaoPauloISOString(new Date()),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: { status: 'unknown', responseTime: 0, error: undefined as string | undefined },
      redis: { status: 'unknown', responseTime: 0, error: undefined as string | undefined },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        loadAverage: process.platform !== 'win32' ? [0, 0, 0] : [0, 0, 0]
      }
    }
  }

  try {
    // Verificar Supabase
    const dbStart = Date.now()
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { error } = await supabase.from('users').select('count').limit(1).single()
      
      health.services.database = {
        status: error ? 'unhealthy' : 'healthy',
        responseTime: Date.now() - dbStart,
        error: error?.message
      }
    }
  } catch (error) {
    health.services.database = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  try {
    // Verificar Redis
    const redisStart = Date.now()
    const redis = await getRedisClient()
    
    if (redis) {
      await redis.ping()
      health.services.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStart,
        error: undefined
      }
    }
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Determinar status geral
  const hasUnhealthyService = Object.values(health.services).some(
    service => typeof service === 'object' && 'status' in service && service.status === 'unhealthy'
  )
  
  if (hasUnhealthyService) {
    health.status = 'degraded'
  }

  // Definir status HTTP baseado na saúde
  const httpStatus = health.status === 'healthy' ? 200 : 503

  // Log de health check
  logger.info(`Health Check - Status: ${health.status}, Response Time: ${Date.now() - startTime}ms`)

  // Retornar resposta JSON explícita
  return {
    ...health,
    responseTime: Date.now() - startTime
  }
})