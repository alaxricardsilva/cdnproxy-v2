import { logger } from '~/utils/logger'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação usando o sistema híbrido melhorado
    const { user, userProfile, supabase } = await requireAdminAuth(event)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = Math.min(parseInt(query.limit as string) || 50, 100)
    const search = query.search as string || ''
    const action = query.action as string || ''
    const userId = query.user_id as string || ''
    const startDate = query.start_date as string || ''
    const endDate = query.end_date as string || ''

    // Build query for audit logs
    let auditQuery = supabase
      .from('access_logs')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          role
        )
      `)

    // Apply filters
    if (search) {
      auditQuery = auditQuery.or(`action.ilike.%${search}%,details.ilike.%${search}%,users.email.ilike.%${search}%`)
    }

    if (action) {
      auditQuery = auditQuery.eq('action', action)
    }

    if (userId) {
      auditQuery = auditQuery.eq('user_id', userId)
    }

    if (startDate) {
      auditQuery = auditQuery.gte('created_at', startDate)
    }

    if (endDate) {
      auditQuery = auditQuery.lte('created_at', endDate)
    }

    // Get total count
    const { count: totalCount } = await auditQuery

    // Apply pagination and ordering
    const { data: auditLogs, error } = await auditQuery
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar logs de auditoria'
      })
    }

    // Get action statistics
    const { data: actionStats } = await supabase
      .from('access_logs')
      .select('action')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const actionCounts = actionStats?.reduce((acc: any, log: any) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {}) || {}

    // Get user activity statistics
    const { data: userStats } = await supabase
      .from('access_logs')
      .select(`
        user_id,
        users!inner(email, name)
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const userActivity = userStats?.reduce((acc: any, log: any) => {
      const userKey = log.users?.email || log.user_id
      acc[userKey] = (acc[userKey] || 0) + 1
      return acc
    }, {}) || {}

    // Get recent critical actions
    const criticalActions = ['user_delete', 'domain_delete', 'settings_update', 'database_cleanup', 'backup_restore']
    const { data: criticalLogs } = await supabase
      .from('access_logs')
      .select(`
        *,
        users!inner(email, name, role)
      `)
      .in('action', criticalActions)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      success: true,
      data: {
        logs: auditLogs || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        },
        statistics: {
          actionCounts,
          userActivity: Object.entries(userActivity)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 10),
          criticalLogs: criticalLogs || []
        },
        filters: {
          search,
          action,
          userId,
          startDate,
          endDate
        }
      }
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})