import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'
import { logger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [HISTORY] Iniciando endpoint de histórico de pagamentos')
    
    // Usar o sistema de autenticação híbrida
    logger.info('🔍 [HISTORY] Chamando requireUserAuth...')
    const { userProfile, supabase } = await requireUserAuth(event)
    logger.info('✅ [HISTORY] Autenticação bem-sucedida para usuário:', userProfile.email)

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const status = query.status as string
    const offset = (page - 1) * limit

    logger.info('📋 [HISTORY] Parâmetros da query:', {
      userId: userProfile.id,
      page,
      limit,
      status,
      offset
    })

    // Construir query - removendo join com plans pois não há relacionamento direto
    let queryBuilder = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrar por status se fornecido
    if (status && ['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      queryBuilder = queryBuilder.eq('status', status)
      logger.info('📋 [HISTORY] Filtro de status aplicado:', { status })
    }

    logger.info('🔍 [HISTORY] Executando query no Supabase...')
    const { data: transactions, error: transactionsError, count } = await queryBuilder

    if (transactionsError) {
      logger.error('❌ [HISTORY] Erro ao buscar transações:', transactionsError.message)
      console.error('Erro ao buscar transações:', transactionsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar histórico de pagamentos'
      })
    }

    logger.info('✅ [HISTORY] Query executada com sucesso:', {
      transactionsCount: transactions?.length || 0,
      totalCount: count
    })

    const response = {
      success: true,
      data: {
        transactions: transactions || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    }

    logger.info('✅ [HISTORY] Resposta preparada com sucesso')
    return response

  } catch (error: any) {
    logger.error('❌ [HISTORY] Erro na API de histórico de pagamentos:', error.message)
    console.error('Erro na API de histórico de pagamentos:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})