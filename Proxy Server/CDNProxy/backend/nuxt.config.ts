// @ts-nocheck
export default defineNuxtConfig({
  ssr: false,
  
  // Desativar completamente o modo de página para backend API-only
  pages: false,
  
  nitro: {
    errorHandler: '~/error.ts',
    routeRules: {
      '/api/**': { 
        cors: true,
        ssr: false,
        prerender: false,
        index: false
      }
    }
  },

  routeRules: {
    '/api/**': { 
      cors: true,
      ssr: false,
      prerender: false,
      index: false
    },
    '/': {
      redirect: '/api/health'
    }
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.JWT_SECRET,
    redisUrl: process.env.REDIS_URL,
    frontendUrl: process.env.FRONTEND_URL,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 5001
  }
})