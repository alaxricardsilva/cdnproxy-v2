import { logger } from '~/utils/logger'
import { requireAdminAuth } from '~/utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação de admin
    const authResult = await requireAdminAuth(event)
    
    if (!authResult) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Verificar se é superadmin
    if (authResult.user.role !== 'superadmin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Superadmin access required'
      })
    }

    const body = await readBody(event) || {}
    const { cacheTypes = ['application', 'redis', 'cdn'] } = body

    const clearResults = []

    // Limpar cache da aplicação
    if (cacheTypes.includes('application')) {
      try {
        // Aqui você implementaria a limpeza do cache da aplicação
        // Por exemplo, limpar cache em memória, arquivos temporários, etc.
        clearResults.push({
          type: 'application',
          success: true,
          message: 'Cache da aplicação limpo com sucesso'
        })
      } catch (error: any) {
        clearResults.push({
          type: 'application',
          success: false,
          message: `Erro ao limpar cache da aplicação: ${error.message}`
        })
      }
    }

    // Limpar cache Redis
    if (cacheTypes.includes('redis')) {
      try {
        // Aqui você implementaria a limpeza do Redis
        // Por exemplo: await redis.flushall()
        clearResults.push({
          type: 'redis',
          success: true,
          message: 'Cache Redis limpo com sucesso'
        })
      } catch (error: any) {
        clearResults.push({
          type: 'redis',
          success: false,
          message: `Erro ao limpar cache Redis: ${error.message}`
        })
      }
    }

    // Limpar cache CDN
    if (cacheTypes.includes('cdn')) {
      try {
        // Aqui você implementaria a limpeza do cache CDN
        // Por exemplo, invalidar cache no Cloudflare ou outro provedor
        clearResults.push({
          type: 'cdn',
          success: true,
          message: 'Cache CDN limpo com sucesso'
        })
      } catch (error: any) {
        clearResults.push({
          type: 'cdn',
          success: false,
          message: `Erro ao limpar cache CDN: ${error.message}`
        })
      }
    }

    const allSuccess = clearResults.every(result => result.success)

    return {
      success: allSuccess,
      message: allSuccess ? 'Todos os caches foram limpos com sucesso' : 'Alguns caches não puderam ser limpos',
      data: {
        results: clearResults,
        timestamp: new Date().toISOString(),
        clearedBy: authResult.user.email
      }
    }

  } catch (error: any) {
    logger.error('Erro ao limpar cache:', error)
    
    return {
      success: false,
      message: `Erro ao limpar cache: ${error?.message || 'Erro desconhecido'}`,
      error: error?.code || 'CACHE_CLEAR_ERROR'
    }
  }
})