import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireSuperAdmin } from '../../../utils/supabase-auth'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)

    // Parâmetros de consulta
    const query = getQuery(event)
    const limit = parseInt(query.limit as string) || 10
    const level = query.level as string
    const service = query.service as string

    // Buscar logs do sistema
    let logsQuery = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (level) {
      logsQuery = logsQuery.eq('level', level)
    }

    if (service) {
      logsQuery = logsQuery.eq('service', service)
    }

    const { data: logs, error } = await logsQuery

    if (error) {
      // Se a tabela não existir, retornar lista vazia em vez de dados simulados
      if (error.code === 'PGRST116' || error.message.includes('relation "system_logs" does not exist')) {
        logger.warn('Tabela system_logs não existe, retornando lista vazia')
        return {
          success: true,
          data: [],
          message: 'Tabela de logs do sistema não configurada'
        }
      }

      throw error
    }

    return {
      success: true,
      data: logs || [],
      mock: false
    }

  } catch (error: any) {
    logger.error('Erro ao buscar logs do sistema:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})