import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '~/utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [NOTIFICATIONS API] Iniciando...')
    
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)
    logger.info('✅ [NOTIFICATIONS API] Autenticação OK:', user.id)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const readStatus = query.read as string || 'all'

    const offset = (page - 1) * limit

    logger.info('📋 [NOTIFICATIONS API] Parâmetros:', { page, limit, readStatus, offset })

    // Build query
    let notificationsQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact' })

    // Filter by user_id
    notificationsQuery = notificationsQuery.eq('user_id', user.id)

    notificationsQuery = notificationsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply read status filter
    if (readStatus !== 'all') {
      const isRead = readStatus === 'read' || readStatus === 'true'
      notificationsQuery = notificationsQuery.eq('read', isRead)
    }

    // Execute query
    const { data: notifications, error: notificationsError, count } = await notificationsQuery

    if (notificationsError) {
      logger.error('❌ [NOTIFICATIONS API] Erro ao buscar notificações:', notificationsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar notificações'
      })
    }

    // Calculate pagination
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    logger.info('✅ [NOTIFICATIONS API] Notificações encontradas:', notifications?.length || 0)

    return {
      success: true,
      data: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }

  } catch (error: any) {
    logger.error('❌ [NOTIFICATIONS API] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})