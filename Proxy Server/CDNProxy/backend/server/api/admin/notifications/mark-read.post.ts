import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [MARK READ API] Iniciando...')
    
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    logger.info('✅ [MARK READ API] Autenticação OK:', user.id)

    // Read request body
    const body = await readBody(event)
    logger.info('📋 [MARK READ API] Dados recebidos:', body)

    // Validate required fields
    if (!body.notification_ids || !Array.isArray(body.notification_ids)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Campo obrigatório: notification_ids (array)'
      })
    }

    // Update notifications status to read
    let updateQuery = supabase
      .from('notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    // Only filter by user_id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      updateQuery = updateQuery.eq('user_id', user.id)
    }

    const { error: updateError } = await updateQuery.in('id', body.notification_ids)

    if (updateError) {
      logger.error('❌ [MARK READ API] Erro ao marcar como lidas:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao marcar notificações como lidas'
      })
    }

    logger.info('✅ [MARK READ API] Notificações marcadas como lidas:', body.notification_ids.length)

    return {
      success: true,
      message: 'Notificações marcadas como lidas',
      data: {
        updated_count: body.notification_ids.length
      }
    }

  } catch (error: any) {
    logger.error('❌ [MARK READ API] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})