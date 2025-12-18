import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

// Só criar o cliente se as variáveis estiverem configuradas
let supabase: any = null
if (supabaseUrl !== 'https://jyconxalcfqvqakrswnb.supabase.co' && supabaseKey !== 'placeholder-key') {
  supabase = createClient(supabaseUrl, supabaseKey)
}

interface GeolocationData {
  country: string
  city: string
  region?: string
  countryCode?: string
  latitude?: number
  longitude?: number
  timezone?: string
  isp?: string
  org?: string
  as?: string
}

// Cache em memória para evitar múltiplas consultas do mesmo IP
const geoCache = new Map<string, GeolocationData>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

// IPs de servidores que devem ser filtrados
const SERVER_IPS = [
  '194.163.131.9',
  '2a02:c207:2241:5964::1',
  '102.216.82.183',
  '2a0c:b641:70:1000::d548:b78e'
]

// Função para detectar se é um IP que deve ser filtrado
function shouldFilterIP(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === 'null') return true
  
  // IPs de servidores específicos
  if (SERVER_IPS.includes(ip)) return true
  
  // IPs privados/locais/localhost
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
    /^localhost$/i
  ]
  
  return privateRanges.some(range => range.test(ip))
}

// Múltiplas APIs de geolocalização com fallback
async function getGeolocationFromAPI(ip: string): Promise<GeolocationData | null> {
  const apis = [
    {
      name: 'ip-api.com',
      url: `http://ip-api.com/json/${ip}?fields=status,country,city,regionName,countryCode,lat,lon,timezone,isp,org,as`,
      parser: (data: any) => ({
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.regionName,
        countryCode: data.countryCode,
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        timezone: data.timezone || 'UTC',
        isp: data.isp || 'Unknown',
        org: data.org || 'Unknown',
        as: data.as || 'Unknown'
      })
    },
    {
      name: 'ipapi.co',
      url: `https://ipapi.co/${ip}/json/`,
      parser: (data: any) => ({
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region,
        countryCode: data.country_code,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        timezone: data.timezone || 'UTC',
        isp: data.org || 'Unknown',
        org: data.org || 'Unknown',
        as: data.asn || 'Unknown'
      })
    },
    {
      name: 'ipinfo.io',
      url: `https://ipinfo.io/${ip}/json`,
      parser: (data: any) => ({
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region,
        countryCode: data.country,
        latitude: data.loc ? parseFloat(data.loc.split(',')[0]) : 0,
        longitude: data.loc ? parseFloat(data.loc.split(',')[1]) : 0,
        timezone: data.timezone || 'UTC',
        isp: data.org || 'Unknown',
        org: data.org || 'Unknown',
        as: data.org || 'Unknown'
      })
    }
  ]

  for (const api of apis) {
    try {
      logger.info(`Tentando API ${api.name} para IP ${ip}`)
      const response = await fetch(api.url)
      
      if (!response.ok) {
        logger.info(`API ${api.name} retornou status ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
      // Verificar se a resposta é válida
      if (api.name === 'ip-api.com' && data.status === 'fail') {
        logger.info(`API ${api.name} falhou:`, data.message)
        continue
      }
      
      if (api.name === 'ipapi.co' && data.error) {
        logger.info(`API ${api.name} falhou:`, data.reason)
        continue
      }
      
      const geoData = api.parser(data)
      
      // Verificar se obtivemos dados válidos
      if (geoData.country && geoData.country !== 'Unknown' && 
          geoData.city && geoData.city !== 'Unknown') {
        logger.info(`API ${api.name} retornou dados válidos para ${ip}:`, geoData)
        return geoData
      }
      
      logger.info(`API ${api.name} retornou dados incompletos para ${ip}:`, geoData)
    } catch (error) {
      logger.error(`Erro na API ${api.name} para IP ${ip}:`, error)
    }
  }
  
  logger.info(`Todas as APIs falharam para IP ${ip}`)
  return null
}

// Função para obter geolocalização do cache do Supabase
async function getGeolocationFromCache(ip: string): Promise<GeolocationData | null> {
  if (!supabase) return null
  
  try {
    const { data, error } = await supabase
      .from('ip_geo_cache')
      .select('country, city, region, country_code, latitude, longitude, timezone, isp, org, as_info, created_at')
      .eq('ip', ip)
      .single()
    
    if (error || !data) return null
    
    // Verificar se o cache não está expirado (24 horas)
    const cacheAge = Date.now() - new Date(data.created_at).getTime()
    if (cacheAge > CACHE_TTL) {
      return null
    }
    
    return {
      country: data.country,
      city: data.city,
      region: data.region,
      countryCode: data.country_code,
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      timezone: data.timezone || 'UTC',
      isp: data.isp || 'Unknown',
      org: data.org || 'Unknown',
      as: data.as_info || 'Unknown'
    }
  } catch (error) {
    console.warn(`Erro ao buscar cache de geolocalização para IP ${ip}:`, error)
    return null
  }
}

// Função para salvar geolocalização no cache do Supabase
async function saveGeolocationToCache(ip: string, geo: GeolocationData): Promise<void> {
  if (!supabase) return
  
  try {
    await supabase
      .from('ip_geo_cache')
      .upsert({
        ip: ip,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        country_code: geo.countryCode,
        latitude: geo.latitude || 0,
        longitude: geo.longitude || 0,
        timezone: geo.timezone || 'UTC',
        isp: geo.isp || 'Unknown',
        org: geo.org || 'Unknown',
        as_info: geo.as || 'Unknown',
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.warn(`Erro ao salvar cache de geolocalização para IP ${ip}:`, error)
  }
}

// Função principal para obter geolocalização
export async function getGeolocation(ip: string): Promise<GeolocationData> {
  // Verificar cache em memória primeiro
  if (geoCache.has(ip)) {
    return geoCache.get(ip)!
  }
  
  // Para IPs que devem ser filtrados, retornar localização padrão
  if (shouldFilterIP(ip)) {
    const defaultGeo: GeolocationData = {
      country: 'Brasil',
      city: 'Cabo de Santo Agostinho',
      region: 'Pernambuco',
      countryCode: 'BR',
      latitude: -8.2751,
      longitude: -35.086,
      timezone: 'America/Recife',
      isp: 'Unknown',
      org: 'Unknown',
      as: 'Unknown'
    }
    geoCache.set(ip, defaultGeo)
    return defaultGeo
  }
  
  // Tentar buscar do cache do Supabase
  let geo = await getGeolocationFromCache(ip)
  
  // Se não encontrou no cache, buscar da API
  if (!geo) {
    geo = await getGeolocationFromAPI(ip)
    
    // Se conseguiu obter da API, salvar no cache
    if (geo) {
      await saveGeolocationToCache(ip, geo)
    }
  }
  
  // Se ainda não conseguiu obter, usar localização padrão
  if (!geo) {
    geo = {
      country: 'Brasil',
      city: 'Cabo de Santo Agostinho',
      region: 'Pernambuco',
      countryCode: 'BR',
      latitude: -8.2751,
      longitude: -35.086,
      timezone: 'America/Recife',
      isp: 'Unknown',
      org: 'Unknown',
      as: 'Unknown'
    }
  }
  
  // Salvar no cache em memória
  geoCache.set(ip, geo)
  
  return geo
}

// Função para limpar cache em memória (útil para testes)
export function clearGeoCache(): void {
  geoCache.clear()
}

// Função para obter estatísticas do cache
export function getGeoCacheStats(): { size: number; keys: string[] } {
  return {
    size: geoCache.size,
    keys: Array.from(geoCache.keys())
  }
}