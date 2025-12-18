import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🧹 [IP-CACHE] Iniciando limpeza de cache expirado...')
    
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    
    // Check if user has superadmin privileges
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    if (!profile || profile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado - apenas superadmin'
      })
    }

    // Get request body
    const body = await readBody(event)
    const daysOld = body?.daysOld || 30 // Default to 30 days

    logger.info('📅 [IP-CACHE] Limpando cache com mais de', daysOld, 'dias')

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    // Count expired entries first
    const { count: expiredCount } = await supabase
      .from('geolocation_cache')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString())

    if (!expiredCount || expiredCount === 0) {
      return {
        success: true,
        message: 'Nenhum cache expirado encontrado',
        removed: 0
      }
    }

    // Delete expired entries
    const { error } = await supabase
      .from('geolocation_cache')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      logger.error('❌ [IP-CACHE] Erro ao limpar cache:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao limpar cache expirado'
      })
    }

    logger.info(`✅ [IP-CACHE] Cache limpo: ${expiredCount} entradas removidas`)

    return {
      success: true,
      message: `Cache limpo com sucesso: ${expiredCount} entradas removidas`,
      removed: expiredCount,
      cutoffDate: cutoffDate.toISOString()
    }

  } catch (error: any) {
    logger.error('❌ [IP-CACHE] Erro na API de limpeza:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})