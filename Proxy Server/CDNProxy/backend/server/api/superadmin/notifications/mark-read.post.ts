import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [SUPERADMIN MARK READ API] Autenticação OK:', user.id)

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    const { notificationId } = body

    if (!notificationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da notificação é obrigatório'
      })
    }

    logger.info('📝 [SUPERADMIN MARK READ] Marcando notificação como lida:', notificationId)

    // Marcar notificação como lida
    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({ 
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ [SUPERADMIN MARK READ] Erro ao marcar como lida:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao marcar notificação como lida'
      })
    }

    logger.info('✅ [SUPERADMIN MARK READ] Notificação marcada como lida:', updatedNotification.id)

    return {
      success: true,
      data: updatedNotification
    }

  } catch (error: any) {
    logger.error('❌ [SUPERADMIN MARK READ API] Erro:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})