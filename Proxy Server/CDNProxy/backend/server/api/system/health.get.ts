import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, setResponseStatus } from 'h3'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    const startTime = Date.now()
    const config = useRuntimeConfig()

    // Initialize Supabase client with runtime config
    const supabaseUrl = config.supabaseUrl || ''
    const supabaseServiceKey = config.supabaseServiceKey || ''
    
    // Check if Supabase configuration is available
    if (!supabaseUrl || !supabaseServiceKey) {
      setResponseStatus(event, 503)
      return {
        status: 'unhealthy',
        timestamp: toSaoPauloISOString(new Date()),
        error: 'Missing Supabase configuration',
        services: {
          database: { status: 'unhealthy', error: 'Missing Supabase configuration' },
          api: { status: 'unhealthy' }
        }
      }
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Test database connection with a table we know exists
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    const dbStatus = error ? 'unhealthy' : 'healthy'
    const responseTime = Date.now() - startTime

    // Get system info
    const systemInfo = {
      status: dbStatus === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: toSaoPauloISOString(new Date()),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: dbStatus,
          responseTime: `${responseTime}ms`,
          error: error?.message || null
        },
        api: {
          status: 'healthy',
          version: '1.0.0'
        }
      }
    }

    // Set appropriate status code
    const statusCode = systemInfo.status === 'healthy' ? 200 : 503

    setResponseStatus(event, statusCode)

    return systemInfo

  } catch (error: any) {
    setResponseStatus(event, 503)
    
    return {
      status: 'unhealthy',
      timestamp: toSaoPauloISOString(new Date()),
      error: error.message || 'Sistema indisponível',
      services: {
        database: { status: 'unhealthy' },
        api: { status: 'unhealthy' }
      }
    }
  }
})