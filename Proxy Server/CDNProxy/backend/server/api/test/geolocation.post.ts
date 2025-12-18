import { defineEventHandler, readBody, createError } from 'h3'
import { getGeolocation } from '../../../utils/geolocation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { ip } = body

    if (!ip) {
      return {
        error: true,
        statusCode: 400,
        statusMessage: 'IP é obrigatório',
        message: 'IP é obrigatório'
      }
    }

    // Validar formato do IP (IPv4 e IPv6)
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
    
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return {
        error: true,
        statusCode: 400,
        statusMessage: 'Formato de IP inválido',
        message: 'Formato de IP inválido'
      }
    }

    console.log(`🧪 [TEST GEOLOCATION] Testando geolocalização para IP: ${ip}`)

    // Obter dados de geolocalização
    const startTime = Date.now()
    const geoData = await getGeolocation(ip)
    const responseTime = Date.now() - startTime

    // Inferir status do cache baseado no tempo de resposta
    const cacheStatus = responseTime < 100 ? 'HIT' : 'MISS'

    console.log(`🌍 [TEST GEOLOCATION] Resultado:`, {
      country: geoData.country,
      city: geoData.city,
      responseTime: `${responseTime}ms`,
      cacheStatus
    })

    return {
      success: true,
      data: {
        ip,
        country: geoData.country,
        countryCode: geoData.countryCode,
        region: geoData.region,
        city: geoData.city,
        latitude: geoData.latitude || 0,
        longitude: geoData.longitude || 0,
        timezone: geoData.timezone || 'UTC',
        isp: geoData.isp || 'Unknown',
        org: geoData.org || 'Unknown',
        as: geoData.as || 'Unknown',
        geolocation: geoData
      },
      responseTime,
      cacheStatus,
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    console.error('💥 [TEST GEOLOCATION] Erro:', error)
    
    return {
      error: true,
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor',
      message: error.message || 'Erro interno do servidor'
    }
  }
})