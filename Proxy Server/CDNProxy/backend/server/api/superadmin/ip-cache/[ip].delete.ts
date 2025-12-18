import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🗑️ [IP-CACHE] Iniciando remoção de IP do cache...')
    
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

    // Get IP from route parameter
    const ip = getRouterParam(event, 'ip')
    
    if (!ip) {
      throw createError({
        statusCode: 400,
        statusMessage: 'IP é obrigatório'
      })
    }

    logger.info('🎯 [IP-CACHE] Removendo IP:', ip)

    // Check if IP exists in cache
    const { data: existingCache } = await supabase
      .from('geolocation_cache')
      .select('id')
      .eq('ip', ip)
      .single()

    if (!existingCache) {
      throw createError({
        statusCode: 404,
        statusMessage: 'IP não encontrado no cache'
      })
    }

    // Delete IP from cache
    const { error } = await supabase
      .from('geolocation_cache')
      .delete()
      .eq('ip', ip)

    if (error) {
      logger.error('❌ [IP-CACHE] Erro ao remover IP:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao remover IP do cache'
      })
    }

    logger.info('✅ [IP-CACHE] IP removido com sucesso:', ip)

    return {
      success: true,
      message: `IP ${ip} removido do cache com sucesso`
    }

  } catch (error: any) {
    logger.error('❌ [IP-CACHE] Erro na API de remoção:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})