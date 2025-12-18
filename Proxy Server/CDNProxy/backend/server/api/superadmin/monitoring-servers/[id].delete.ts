import { logger } from '~/utils/logger'
import { requireAdminAuth } from '~/utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🗑️ [DELETE MONITORING SERVER API] Iniciando exclusão...')
    
    // Verificar autenticação de superadmin (apenas SUPERADMIN pode deletar)
    const { supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    
    // Obter ID do servidor da URL
    const serverId = getRouterParam(event, 'id')
    
    if (!serverId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do servidor é obrigatório'
      })
    }
    
    // Verificar se o servidor existe
    const { data: existingServer, error: fetchError } = await supabase
      .from('monitoring_servers')
      .select('*')
      .eq('id', serverId)
      .single()
    
    if (fetchError || !existingServer) {
      logger.error('❌ [DELETE MONITORING SERVER API] Servidor não encontrado:', serverId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Servidor não encontrado'
      })
    }
    
    // Verificar se é o servidor padrão
    if (existingServer.is_default) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Não é possível excluir o servidor padrão. Defina outro servidor como padrão primeiro.'
      })
    }
    
    // Deletar o servidor
    const { error: deleteError } = await supabase
      .from('monitoring_servers')
      .delete()
      .eq('id', serverId)
    
    if (deleteError) {
      logger.error('❌ [DELETE MONITORING SERVER API] Erro ao deletar:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao excluir servidor'
      })
    }
    
    logger.info(`✅ [DELETE MONITORING SERVER API] Servidor ${existingServer.name} excluído com sucesso`)
    
    return {
      success: true,
      message: `Servidor "${existingServer.name}" excluído com sucesso`
    }
    
  } catch (error: any) {
    logger.error('❌ [DELETE MONITORING SERVER API] Erro:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})