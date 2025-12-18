import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdmin } from '../../../utils/supabase-auth'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

    // Validar autenticação e autorização com Supabase
    const user = await requireAdmin(event)

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const status = query.status as string
    const offset = (page - 1) * limit

    // Create Supabase client
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Construir query base
    let queryBuilder = supabase
      .from('transactions')
      .select(`
        *,
        plans!inner(
          id,
          name,
          description,
          price,
          duration_value,
          duration_type
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Aplicar filtro de status se fornecido
    if (status && ['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      queryBuilder = queryBuilder.eq('status', status)
    }

    // Buscar transações com paginação
    const { data: transactions, error: transactionsError } = await queryBuilder
      .range(offset, offset + limit - 1)

    if (transactionsError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar transações'
      })
    }

    // Contar total de transações para paginação
    let countQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (status && ['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao contar transações'
      })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return {
      success: true,
      data: {
        transactions: transactions?.map(transaction => ({
          id: transaction.id,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.currency,
          billing_cycle: transaction.billing_cycle,
          payment_method: transaction.payment_method,
          external_id: transaction.external_id,
          created_at: transaction.created_at,
          updated_at: transaction.updated_at,
          expires_at: transaction.expires_at,
          plan: transaction.plans
        })) || [],
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
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})