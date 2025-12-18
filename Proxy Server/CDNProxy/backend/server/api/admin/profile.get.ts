import { logger } from '../../../utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Usar o sistema de autenticação híbrida
    const { userProfile, supabase } = await requireUserAuth(event)

    // Verificar se o usuário tem permissão de ADMIN (case-insensitive)
    if (userProfile.role?.toUpperCase() !== 'ADMIN' && userProfile.role?.toUpperCase() !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado. Permissão de ADMIN necessária.'
      })
    }

    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        status,
        created_at,
        updated_at
      `)
      .eq('id', userProfile.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    // Buscar contagem de domínios
    const { count: domainsCount } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)

    // Buscar contagem de transações
    const { count: transactionsCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)

    return {
      success: true,
      data: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        stats: {
          total_domains: domainsCount || 0,
          total_transactions: transactionsCount || 0
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro ao buscar perfil:', error)

    // Se for um erro conhecido, retornar como está
    if (error.statusCode) {
      throw error
    }

    // Erro genérico
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})