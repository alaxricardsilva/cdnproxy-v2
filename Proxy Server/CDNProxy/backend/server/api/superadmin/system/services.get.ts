import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'
import { checkRedisHealth } from '../../../../utils/redis'

export default defineEventHandler(async (event) => {
  try {
    // Autenticar o administrador e obter o cliente Supabase
    const { user, supabase } = await requireAdminAuth(event)
    
    // Verifique se o usuário tem privilégios de superadministrador
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

    // Verificar status do banco de dados (Supabase)
    let databaseStatus = false
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      databaseStatus = !error && data !== null
    } catch (error) {
      logger.error('Database health check failed:', error)
      databaseStatus = false
    }

    // Verificar status do Redis
    let redisStatus = false
    try {
      const redisHealth = await checkRedisHealth()
      redisStatus = redisHealth.status === 'active'
      logger.info('Redis health check result:', redisHealth)
    } catch (error) {
      logger.error('Redis health check failed:', error)
      redisStatus = false
    }

    // Verifique o status do CDN (verificação básica - pode ser aprimorada)
    let cdnStatus = true // Supondo que o CDN esteja sempre disponível por enquanto
    
    // Você pode adicionar verificações de CDN mais sofisticadas aqui
    // Por exemplo, verificar se os servidores proxy estão respondendo
    try {
      const { data: servers } = await supabase
        .from('servers')
        .select('status')
        .eq('status', 'active')
      
      cdnStatus = servers && servers.length > 0
    } catch (error) {
      logger.error('CDN health check failed:', error)
      cdnStatus = false
    }

    const servicesStatus = {
      database: databaseStatus,
      redis: redisStatus,
      cdn: cdnStatus
    }

    return {
      success: true,
      data: servicesStatus,
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Error checking services status:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})