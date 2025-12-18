import { logger } from '~/utils/logger'
export default defineEventHandler(async (event) => {
  // Endpoint temporário para debug das variáveis de ambiente
  
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    JWT_SECRET: process.env.JWT_SECRET ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD !== undefined ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    SETUP_TOKEN: process.env.SETUP_TOKEN ? 'DEFINIDA' : 'NÃO ENCONTRADA'
  };

  // Verificar runtimeConfig do Nuxt
  const config = useRuntimeConfig();
  
  const runtimeVars = {
    supabaseUrl: config.supabaseUrl ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    supabaseServiceKey: config.supabaseServiceKey ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    supabaseAnonKey: config.supabaseAnonKey ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    jwtSecret: config.jwtSecret ? 'DEFINIDA' : 'NÃO ENCONTRADA',
    public: {
      supabaseUrl: config.public?.supabaseUrl ? 'DEFINIDA' : 'NÃO ENCONTRADA',
      supabaseAnonKey: config.public?.supabaseAnonKey ? 'DEFINIDA' : 'NÃO ENCONTRADA'
    }
  };

  return {
    message: 'Debug das variáveis de ambiente',
    processEnv: envVars,
    runtimeConfig: runtimeVars,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
});