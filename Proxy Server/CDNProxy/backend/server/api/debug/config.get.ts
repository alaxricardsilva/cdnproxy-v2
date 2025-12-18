import { logger } from '~/utils/logger'
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  return {
    success: true,
    config: {
      supabaseUrl: config.supabaseUrl,
      supabaseServiceKey: config.supabaseServiceKey ? '***PRESENTE***' : 'AUSENTE',
      supabaseAnonKey: config.supabaseAnonKey ? '***PRESENTE***' : 'AUSENTE',
      jwtSecret: config.jwtSecret ? '***PRESENTE***' : 'AUSENTE',
      redisPassword: config.redisPassword ? '***PRESENTE***' : 'AUSENTE',
      setupToken: config.setupToken ? '***PRESENTE***' : 'AUSENTE'
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***PRESENTE***' : 'AUSENTE',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***PRESENTE***' : 'AUSENTE',
      JWT_SECRET: process.env.JWT_SECRET ? '***PRESENTE***' : 'AUSENTE'
    }
  }
})