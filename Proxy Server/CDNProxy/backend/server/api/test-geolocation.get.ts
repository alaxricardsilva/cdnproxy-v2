import { logger } from '~/utils/logger'
import { defineEventHandler, getQuery } from 'h3'
import { getGeolocation } from '../../utils/geolocation'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const ip = query.ip as string || '8.8.8.8'

    logger.info(`🧪 [TEST GEOLOCATION] Testando geolocalização para IP: ${ip}`)

    // Obter dados de geolocalização
    const startTime = Date.now()
    const geoData = await getGeolocation(ip)
    const responseTime = Date.now() - startTime

    // Inferir status do cache baseado no tempo de resposta
    const cacheStatus = responseTime < 100 ? 'HIT' : 'MISS'

    logger.info(`🌍 [TEST GEOLOCATION] Resultado:`, {
      country: geoData.country,
      city: geoData.city,
      responseTime: `${responseTime}ms`,
      cacheStatus
    })

    return {
      success: true,
      data: {
        ip,
        geolocation: geoData,
        responseTime,
        cacheStatus,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error: any) {
    logger.error('💥 [TEST GEOLOCATION] Erro:', error)
    
    return {
      error: true,
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor',
      message: error.message || 'Erro interno do servidor'
    }
  }
})