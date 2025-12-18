import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    
    // Check if user has superadmin privileges
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

    const keyId = getRouterParam(event, 'id')
    
    if (!keyId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da chave é obrigatório'
      })
    }

    // Check if key exists
    const { data: existingKey, error: fetchError } = await supabase
      .from('monitoring_api_keys')
      .select('id, name')
      .eq('id', keyId)
      .single()

    if (fetchError || !existingKey) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Chave de API não encontrada'
      })
    }

    // Delete the API key
    const { error: deleteError } = await supabase
      .from('monitoring_api_keys')
      .delete()
      .eq('id', keyId)

    if (deleteError) {
      logger.error('Erro ao deletar chave de API:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao deletar chave de API'
      })
    }

    return {
      success: true,
      message: `Chave de API "${existingKey.name}" foi deletada com sucesso`
    }
  } catch (error: any) {
    logger.error('Erro no endpoint de deleção de chave de API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})