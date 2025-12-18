import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || ''
    const status = query.status as string || ''
    const period = query.period as string || ''

    // Build query for transactions of the logged ADMIN user
    let paymentsQuery = supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        amount,
        type,
        status,
        description,
        created_at,
        updated_at,
        payment_method,
        domain_id,
        currency,
        payment_id,
        metadata
      `, { count: 'exact' })

    // Se é admin local, buscar todos os pagamentos; se é admin do Supabase, filtrar por user_id
    if (user.id !== 'admin') {
      // Verificar se user.id é um UUID válido antes de fazer a query
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(user.id)) {
        paymentsQuery = paymentsQuery.eq('user_id', user.id)
      } else {
        logger.info('⚠️ [payments.get] user.id não é UUID válido, buscando todos os pagamentos')
      }
    }

    // Add search filter if provided
    if (search) {
      paymentsQuery = paymentsQuery.or(`payment_id.ilike.%${search}%,payment_method.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Add status filter if provided
    if (status) {
      paymentsQuery = paymentsQuery.eq('status', status)
    }

    // Add period filter if provided
    if (period) {
      const now = new Date()
      let startDate: Date | null = null

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          break
      }

      if (startDate) {
        paymentsQuery = paymentsQuery.gte('created_at', startDate.toISOString())
      }
    }

    // Add pagination
    const offset = (page - 1) * limit
    paymentsQuery = paymentsQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    const { data: payments, error, count } = await paymentsQuery

    if (error) {
      logger.error('Supabase error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar pagamentos'
      })
    }

    // Calculate statistics for the admin user
    const { data: statsData, error: statsError } = await supabase
      .from('transactions')
      .select('amount, status')
      .eq('user_id', user.id)

    let stats = {
      totalRevenue: 0,
      totalTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0
    }

    if (!statsError && statsData) {
      stats = {
        totalRevenue: statsData
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        totalTransactions: statsData.length,
        pendingTransactions: statsData.filter(p => p.status === 'pending').length,
        failedTransactions: statsData.filter(p => p.status === 'failed').length
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)

    return {
      success: true,
      data: {
        payments: payments || [],
        total: count || 0,
        stats,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro na API admin/payments:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})