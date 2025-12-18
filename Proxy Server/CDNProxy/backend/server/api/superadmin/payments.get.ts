import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth, supabaseAdmin } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const search = query.search as string || ''
    const status = query.status as string || ''
    const userId = query.userId as string || ''
    const offset = (page - 1) * limit

    // Supabase client já disponível via requireAdminAuth

    // Construir query base para buscar todos os pagamentos
    let queryBuilder = supabase
      .from('transactions')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          role
        )
      `)

    // Aplicar filtros
    if (search) {
      queryBuilder = queryBuilder.or(`
        users.email.ilike.%${search}%,
        users.name.ilike.%${search}%
      `)
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId)
    }

    // Buscar pagamentos com paginação
    const { data: payments, error: paymentsError } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (paymentsError) {
      logger.error('Erro ao buscar pagamentos:', paymentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro interno do servidor'
      })
    }

    // Buscar total de registros para paginação
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      logger.error('Erro ao contar pagamentos:', countError)
    }

    // Buscar estatísticas gerais
    const { data: stats, error: statsError } = await supabase
      .from('transactions')
      .select('status, amount')

    let totalPayments = 0
    let approved = 0
    let pending = 0
    let totalAmount = 0

    if (stats && !statsError) {
      totalPayments = stats.length
      approved = stats.filter((t: any) => t.status === 'COMPLETED' || t.status === 'APPROVED').length
      pending = stats.filter((t: any) => t.status === 'PENDING').length
      totalAmount = stats
        .filter((t: any) => t.status === 'COMPLETED' || t.status === 'APPROVED')
        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0)
    }

    // Formatar dados dos pagamentos
    const formattedPayments = payments?.map((payment: any) => ({
      id: payment.id,
      user: {
        id: payment.users.id,
        name: payment.users.name || payment.users.email,
        email: payment.users.email
      },
      plan: null, // Não há relacionamento direto com plans na tabela transactions
      amount: parseFloat(payment.amount),
      status: payment.status,
      payment_method: payment.payment_method,
      transaction_id: payment.payment_id,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      expires_at: null
    })) || []

    return {
      success: true,
      data: {
        payments: formattedPayments,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        stats: {
          totalPayments,
          approved,
          pending,
          totalAmount
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro na API de pagamentos do superadmin:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})