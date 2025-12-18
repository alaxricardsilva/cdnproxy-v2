import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Validar autenticação e autorização
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Parâmetros de consulta
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const search = query.search as string
    const status = query.status as string
    const userId = query.userId as string

    const offset = (page - 1) * limit

    logger.info('🔍 Testando API de pagamentos simplificada...')
    logger.info('   Parâmetros:', { page, limit, search, status, userId })

    // Teste 1: SELECT simples da tabela transactions
    logger.info('1️⃣ Testando SELECT simples...')
    const { data: simpleData, error: simpleError } = await supabase
      .from('transactions')
      .select('*')
      .limit(limit)

    if (simpleError) {
      logger.error('❌ Erro no SELECT simples:', simpleError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro no SELECT simples: ${simpleError.message}`
      })
    }

    logger.info('✅ SELECT simples funcionou! Registros:', simpleData?.length || 0)

    // Teste 2: COUNT da tabela
    logger.info('2️⃣ Testando COUNT...')
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      logger.error('❌ Erro no COUNT:', countError)
    } else {
      logger.info('✅ COUNT funcionou! Total:', count || 0)
    }

    // Teste 3: SELECT com filtros básicos
    let queryBuilder = supabase
      .from('transactions')
      .select('*')

    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId)
    }

    logger.info('3️⃣ Testando SELECT com filtros...')
    const { data: filteredData, error: filteredError } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filteredError) {
      logger.error('❌ Erro no SELECT com filtros:', filteredError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro no SELECT com filtros: ${filteredError.message}`
      })
    }

    logger.info('✅ SELECT com filtros funcionou! Registros:', filteredData?.length || 0)

    // Retornar dados simplificados
    return {
      success: true,
      data: {
        payments: filteredData || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        stats: {
          totalTransactions: count || 0,
          totalAmount: 0 // Calculado posteriormente se necessário
        }
      }
    }

  } catch (error: any) {
    logger.error('❌ Erro na API de pagamentos simplificada:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})