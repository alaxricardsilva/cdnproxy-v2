import logger from './logger'
import Redis from 'ioredis'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    // Configuração simples sem senha
    redisClient = new Redis({
      host: 'redis',
      port: 6379,
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
    })

    logger.info('Creating Redis client without password')

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully!')
    })

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error)
    })

    redisClient.on('ready', () => {
      logger.info('Redis is ready to receive commands')
    })

    redisClient.on('close', () => {
      logger.info('Redis connection closed')
    })
  }

  return redisClient
}

export async function checkRedisHealth(): Promise<{
  status: 'active' | 'inactive' | 'error'
  responseTime?: number
  error?: string
  info?: any
}> {
  try {
    const client = getRedisClient()
    const startTime = Date.now()
    
    // Test connection with ping
    await client.ping()
    const responseTime = Date.now() - startTime

    // Get Redis info
    const info = await client.info('server')
    const infoObj = parseRedisInfo(info)

    return {
      status: 'active',
      responseTime,
      info: {
        version: infoObj.redis_version,
        uptime: infoObj.uptime_in_seconds,
        connected_clients: infoObj.connected_clients,
        used_memory_human: infoObj.used_memory_human,
        total_commands_processed: infoObj.total_commands_processed
      }
    }
  } catch (error: any) {
    logger.error('Redis health check failed:', error)
    return {
      status: 'error',
      error: error.message || 'Connection failed'
    }
  }
}

function parseRedisInfo(info: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = info.split('\r\n')
  
  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':')
      if (key && value) {
        result[key] = isNaN(Number(value)) ? value : Number(value)
      }
    }
  }
  
  return result
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}