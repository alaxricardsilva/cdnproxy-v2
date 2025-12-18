import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [IP-CACHE] Iniciando busca de IPs em cache...')
    
    // Authenticate superadmin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = Math.min(parseInt(query.limit as string) || 50, 100)
    const search = query.search as string
    const country = query.country as string
    const city = query.city as string

    logger.info('📋 [IP-CACHE] Parâmetros:', { page, limit, search, country, city })

    // Build query for geolocation cache
    let cacheQuery = supabase
      .from('ip_geo_cache')
      .select('*', { count: 'exact' })

    // Add search filter
    if (search) {
      cacheQuery = cacheQuery.or(`ip.ilike.%${search}%,country.ilike.%${search}%,city.ilike.%${search}%`)
    }

    // Add country filter
    if (country) {
      cacheQuery = cacheQuery.eq('country', country)
    }

    // Add city filter
    if (city) {
      cacheQuery = cacheQuery.eq('city', city)
    }

    // Add pagination and ordering
    const offset = (page - 1) * limit
    cacheQuery = cacheQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    const { data: ipCache, error, count } = await cacheQuery

    if (error) {
      logger.error('❌ [IP-CACHE] Erro ao buscar cache:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar cache de IPs'
      })
    }

    logger.info(`✅ [IP-CACHE] Encontrados ${ipCache?.length || 0} IPs em cache`)

    // Get statistics
    const { data: stats } = await supabase
      .from('ip_geo_cache')
      .select('country, city, created_at')

    const statistics = {
      total: count || 0,
      countries: [...new Set(stats?.map(s => s.country).filter(Boolean))].length,
      cities: [...new Set(stats?.map(s => s.city).filter(Boolean))].length,
      today: stats?.filter(s => {
        const today = new Date().toDateString()
        return new Date(s.created_at).toDateString() === today
      }).length || 0
    }

    // Get top countries
    const countryStats = stats?.reduce((acc, item) => {
      if (item.country) {
        acc[item.country] = (acc[item.country] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>) || {}

    const topCountries = Object.entries(countryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    // Format IP cache data
    const formattedCache = ipCache?.map(cache => ({
      id: cache.id,
      ip: cache.ip,
      country: cache.country || 'Desconhecido',
      countryCode: cache.country_code || null,
      city: cache.city || 'Desconhecida',
      region: cache.region || null,
      created_at: cache.created_at,
      updated_at: cache.updated_at
    })) || []

    return {
      success: true,
      data: formattedCache,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      statistics,
      topCountries
    }

  } catch (error: any) {
    logger.error('❌ [IP-CACHE] Erro na API:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})