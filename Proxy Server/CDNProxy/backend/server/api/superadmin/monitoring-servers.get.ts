import { logger } from '~/utils/logger'
import { requireAdminAuth } from '~/utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [MONITORING SERVERS API] Iniciando busca de servidores...')
    
    // Verificar autenticação de admin
    const { supabase } = await requireAdminAuth(event, 'ADMIN')
    
    // Buscar servidores de monitoramento
    const { data: servers, error } = await supabase
      .from('monitoring_servers')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
    
    if (error) {
      logger.error('❌ [MONITORING SERVERS API] Erro ao buscar servidores:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar servidores de monitoramento'
      })
    }
    
    logger.info(`✅ [MONITORING SERVERS API] ${servers?.length || 0} servidores encontrados`)
    
    return {
      success: true,
      data: servers || [],
      total: servers?.length || 0
    }
    
  } catch (error: any) {
    logger.error('❌ [MONITORING SERVERS API] Erro:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})