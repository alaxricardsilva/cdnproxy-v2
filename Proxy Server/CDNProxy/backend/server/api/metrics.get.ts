import { logger } from '~/utils/logger'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      arrayBuffers: Math.round(process.memoryUsage().arrayBuffers / 1024 / 1024)
    },
    process: {
      cpuUsage: process.cpuUsage(),
      hrtime: process.hrtime()
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabase: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasRedis: !!process.env.REDIS_PASSWORD,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
  }

  // Headers para Prometheus (se necessário)
  event.node.res.setHeader('Content-Type', 'application/json')
  
  return metrics
})