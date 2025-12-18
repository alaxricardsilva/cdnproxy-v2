import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [SUPERADMIN NOTIFICATIONS API] Iniciando...')
    
    // Authenticate superadmin and get Supabase client
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [SUPERADMIN NOTIFICATIONS API] Autenticação OK:', user.id)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const status = query.status as string || 'all'
    const type = query.type as string || 'all'

    const offset = (page - 1) * limit

    logger.info('📋 [SUPERADMIN NOTIFICATIONS API] Parâmetros:', { page, limit, status, type, offset })

    // Build query - SUPERADMIN sees ALL notifications
    let notificationsQuery = supabase
      .from('notifications')
      .select('id, user_id, title, message, type, read, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter (usar read boolean)
    if (status !== 'all' && status) {
      if (status === 'read') {
        notificationsQuery = notificationsQuery.eq('read', true)
      } else if (status === 'unread') {
        notificationsQuery = notificationsQuery.eq('read', false)
      }
    }

    // Apply type filter
    if (type !== 'all' && type) {
      notificationsQuery = notificationsQuery.eq('type', type)
    }

    // Execute query
    const { data: notifications, error: notificationsError, count } = await notificationsQuery

    if (notificationsError) {
      logger.error('❌ [SUPERADMIN NOTIFICATIONS API] Erro ao buscar notificações:', notificationsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar notificações'
      })
    }

    // Buscar dados dos usuários separadamente se necessário
    let enrichedNotifications = notifications || []
    
    if (notifications && notifications.length > 0) {
      const userIds = [...new Set(notifications.map(n => n.user_id).filter(Boolean))]
      
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, name')
          .in('id', userIds)
        
        if (!usersError && users) {
          const usersMap = new Map(users.map(u => [u.id, u]))
          enrichedNotifications = notifications.map(notification => ({
            ...notification,
            user: notification.user_id ? usersMap.get(notification.user_id) : null
          }))
        }
      }
    }

    // Calculate pagination
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    logger.info('✅ [SUPERADMIN NOTIFICATIONS API] Notificações encontradas:', notifications?.length || 0)

    return {
      success: true,
      data: {
        notifications: enrichedNotifications,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNextPage,
          hasPreviousPage: page > 1
        },
        filters: {
          status,
          type
        }
      }
    }

  } catch (error: any) {
    logger.error('❌ [SUPERADMIN NOTIFICATIONS API] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})