import { logger } from '../../../utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireUserAuth } from '../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '../../../utils/timezone'
import { getGeoLocationFromIP } from '../../../utils/geolocation-service'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const period = query.period as string || '7d' // 1d, 7d, 30d, 90d
    const domain = query.domain as string

    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    // Get user's domains
    const { data: userDomains, error: domainsError } = await supabase
      .from('domains')
      .select('id, domain')
      .eq('user_id', user.id)

    if (domainsError) {
      logger.error('Error fetching user domains:', domainsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar domínios do usuário'
      })
    }

    const domainIds = userDomains?.map(d => d.id) || []

    // If no domains, return empty geo data
    if (domainIds.length === 0) {
      return {
        success: true,
        data: {
          totalVisitors: 0,
          countriesData: [],
          citiesData: [],
          continentsData: [],
          topCountries: [],
          geoTimeline: [],
          mapData: []
        },
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          period
        },
        timestamp: toSaoPauloISOString()
      }
    }

    // Build query for geo analytics
    let geoQuery = supabase
      .from('access_logs')
      .select('*')
      .in('domain_id', domainIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Filter by specific domain if provided
    if (domain) {
      const domainRecord = userDomains?.find(d => d.domain === domain)
      if (domainRecord) {
        geoQuery = geoQuery.eq('domain_id', domainRecord.id)
      }
    }

    // Execute query
    const { data: geoLogs, error: logsError } = await geoQuery

    if (logsError) {
      logger.error('Error fetching geo logs:', logsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar logs geográficos'
      })
    }

    const logs = geoLogs || []
    const totalVisitors = logs.length

    // Process geographic data
    const countryData: Record<string, {
      visitors: number
      uniqueIPs: Set<string>
      cities: Record<string, number>
    }> = {}

    // Processar dados geográficos de forma assíncrona
    for (const log of logs) {
      const ip = log.ip_address || ''
      const geoData = await getGeoLocationFromIP(ip)
      
      if (!countryData[geoData.country]) {
        countryData[geoData.country] = {
          visitors: 0,
          uniqueIPs: new Set(),
          cities: {}
        }
      }
      
      countryData[geoData.country].visitors++
      countryData[geoData.country].uniqueIPs.add(ip)
      
      if (geoData.city) {
        countryData[geoData.country].cities[geoData.city] = 
          (countryData[geoData.country].cities[geoData.city] || 0) + 1
      }
    }

    // Process countries data
    const countriesData = []
    for (const [country, data] of Object.entries(countryData)) {
      const firstIP = data.uniqueIPs.values().next().value
      const geoData = firstIP ? await getGeoLocationFromIP(firstIP) : null
      
      countriesData.push({
        country,
        visitors: data.visitors,
        uniqueVisitors: data.uniqueIPs.size,
        percentage: Math.round((data.visitors / totalVisitors) * 100),
        continent: getContinentFromCountry(country),
        flag: getCountryFlag(geoData?.countryCode || 'XX'),
        coordinates: getCountryCoordinates(geoData?.countryCode || 'XX')
      })
    }
    
    // Sort by visitors
    countriesData.sort((a, b) => b.visitors - a.visitors)

    // Process cities data
    const allCities: Array<{
      city: string
      country: string
      visitors: number
      coordinates: [number, number]
    }> = []

    Object.entries(countryData).forEach(([country, data]) => {
      Object.entries(data.cities).forEach(([city, visitors]) => {
        allCities.push({
          city,
          country,
          visitors: visitors as number,
          coordinates: getCityCoordinates(city, country)
        })
      })
    })

    const citiesData = allCities
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 20)

    // Process continents data
    const continentData: Record<string, number> = {}
    countriesData.forEach(country => {
      continentData[country.continent] = 
        (continentData[country.continent] || 0) + country.visitors
    })

    const continentsData = Object.entries(continentData)
      .map(([continent, visitors]) => ({
        continent,
        visitors: visitors as number,
        percentage: Math.round((visitors as number / totalVisitors) * 100)
      }))
      .sort((a, b) => b.visitors - a.visitors)

    // Get top countries (top 10)
    const topCountries = countriesData.slice(0, 10)

    // Generate geo timeline
    const geoTimeline = await generateGeoTimeline(logs, startDate, endDate, period)

    // Prepare map data for visualization
    const mapData = countriesData.map(country => ({
      country: country.country,
      countryCode: getCountryCode(country.country),
      visitors: country.visitors,
      coordinates: country.coordinates,
      intensity: Math.min(country.visitors / Math.max(...countriesData.map(c => c.visitors)), 1)
    }))

    return {
      success: true,
      data: {
        totalVisitors,
        countriesData,
        citiesData,
        continentsData,
        topCountries,
        geoTimeline,
        mapData
      },
      period: {
        start: toSaoPauloISOString(startDate),
        end: toSaoPauloISOString(endDate),
        period
      },
      timestamp: toSaoPauloISOString()
    }

  } catch (error: any) {
    logger.error('Error in analytics geo:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Função removida - agora usando o serviço real de geolocalização

function getContinentFromCountry(country: string): string {
  const continentMap: Record<string, string> = {
    'Brasil': 'América do Sul',
    'Estados Unidos': 'América do Norte',
    'Canadá': 'América do Norte',
    'Reino Unido': 'Europa',
    'Alemanha': 'Europa',
    'França': 'Europa',
    'Austrália': 'Oceania',
    'Local': 'Local'
  }
  
  return continentMap[country] || 'Outros'
}

function getCountryFlag(country: string): string {
  const flagMap: Record<string, string> = {
    'Brasil': '🇧🇷',
    'Estados Unidos': '🇺🇸',
    'Reino Unido': '🇬🇧',
    'Alemanha': '🇩🇪',
    'França': '🇫🇷',
    'Canadá': '🇨🇦',
    'Austrália': '🇦🇺',
    'Local': '🏠'
  }
  
  return flagMap[country] || '🌍'
}

function getCountryCode(country: string): string {
  const codeMap: Record<string, string> = {
    'Brasil': 'BR',
    'Estados Unidos': 'US',
    'Reino Unido': 'GB',
    'Alemanha': 'DE',
    'França': 'FR',
    'Canadá': 'CA',
    'Austrália': 'AU',
    'Local': 'LOCAL'
  }
  
  return codeMap[country] || 'XX'
}

function getCountryCoordinates(country: string): [number, number] {
  const coordMap: Record<string, [number, number]> = {
    'Brasil': [-14.2350, -51.9253],
    'Estados Unidos': [39.8283, -98.5795],
    'Reino Unido': [55.3781, -3.4360],
    'Alemanha': [51.1657, 10.4515],
    'França': [46.2276, 2.2137],
    'Canadá': [56.1304, -106.3468],
    'Austrália': [-25.2744, 133.7751],
    'Local': [0, 0]
  }
  
  return coordMap[country] || [0, 0]
}

function getCityCoordinates(city: string, country: string): [number, number] {
  // Simplified city coordinates - in production would use a proper geocoding service
  const cityCoordMap: Record<string, [number, number]> = {
    'São Paulo': [-23.5505, -46.6333],
    'Rio de Janeiro': [-22.9068, -43.1729],
    'New York': [40.7128, -74.0060],
    'Los Angeles': [34.0522, -118.2437],
    'London': [51.5074, -0.1278],
    'Paris': [48.8566, 2.3522],
    'Berlin': [52.5200, 13.4050],
    'Toronto': [43.6532, -79.3832],
    'Sydney': [-33.8688, 151.2093]
  }
  
  return cityCoordMap[city] || getCountryCoordinates(country)
}

async function generateGeoTimeline(logs: any[], startDate: Date, endDate: Date, period: string) {
  const timeline = []
  const isHourly = period === '1d'
  
  if (isHourly) {
    // Generate hourly data for 1 day
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startDate)
      hourStart.setHours(hour, 0, 0, 0)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hour + 1, 0, 0, 0)
      
      const hourLogs = logs.filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= hourStart && logDate < hourEnd
      })
      
      const hourCountries: Record<string, number> = {}
      for (const log of hourLogs) {
        const geoData = await getGeoLocationFromIP(log.ip_address || '')
        const country = geoData.country
        hourCountries[country] = (hourCountries[country] || 0) + 1
      }
      
      const topCountry = Object.entries(hourCountries)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]
      
      timeline.push({
        timestamp: toSaoPauloISOString(hourStart),
        totalVisitors: hourLogs.length,
        topCountry: topCountry ? topCountry[0] : null,
        topCountryVisitors: topCountry ? topCountry[1] : 0,
        uniqueCountries: Object.keys(hourCountries).length
      })
    }
  } else {
    // Generate daily data
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    for (let day = 0; day < days; day++) {
      const dayStart = new Date(startDate)
      dayStart.setDate(startDate.getDate() + day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)
      
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.created_at)
        return logDate >= dayStart && logDate < dayEnd
      })
      
      const dayCountries: Record<string, number> = {}
      for (const log of dayLogs) {
        const geoData = await getGeoLocationFromIP(log.ip_address || '')
        const country = geoData.country
        dayCountries[country] = (dayCountries[country] || 0) + 1
      }
      
      const topCountry = Object.entries(dayCountries)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]
      
      timeline.push({
        timestamp: toSaoPauloISOString(dayStart),
        totalVisitors: dayLogs.length,
        topCountry: topCountry ? topCountry[0] : null,
        topCountryVisitors: topCountry ? topCountry[1] : 0,
        uniqueCountries: Object.keys(dayCountries).length
      })
    }
  }
  
  return timeline
}