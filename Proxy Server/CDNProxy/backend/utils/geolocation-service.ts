import { logger } from './logger'

interface GeoLocationData {
  country: string
  city: string
  countryCode: string
  continent: string
  latitude?: number
  longitude?: number
}

interface ApiProvider {
  name: string
  url: (ip: string) => string
  parseResponse: (data: any) => GeoLocationData | null
  rateLimit: number // milliseconds between requests
  maxRetries: number
}

// Cache para evitar múltiplas requisições para o mesmo IP
const geoCache = new Map<string, GeoLocationData>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas em milliseconds
const cacheTimestamps = new Map<string, number>()

// Rate limiting por provider
const lastRequestTimes = new Map<string, number>()

// Configuração de múltiplas APIs de geolocalização
const API_PROVIDERS: ApiProvider[] = [
  {
    name: 'ip-api',
    url: (ip: string) => `http://ip-api.com/json/${ip}`,
    parseResponse: (data: any) => {
      if (data.status === 'fail') return null
      return {
        country: data.country || 'Desconhecido',
        city: data.city || 'Desconhecido',
        countryCode: data.countryCode || 'XX',
        continent: getContinentFromCode(data.countryCode || 'XX'),
        latitude: data.lat,
        longitude: data.lon
      }
    },
    rateLimit: 100,
    maxRetries: 2
  },
  {
    name: 'ipapi',
    url: (ip: string) => `https://ipapi.co/${ip}/json/`,
    parseResponse: (data: any) => {
      if (data.error) return null
      return {
        country: data.country_name || 'Desconhecido',
        city: data.city || 'Desconhecido',
        countryCode: data.country_code || 'XX',
        continent: getContinentFromCode(data.continent_code || 'XX'),
        latitude: data.latitude,
        longitude: data.longitude
      }
    },
    rateLimit: 1000,
    maxRetries: 1
  },
  {
    name: 'ipinfo',
    url: (ip: string) => `https://ipinfo.io/${ip}/json`,
    parseResponse: (data: any) => {
      if (data.error || data.bogon) return null
      const [lat, lon] = (data.loc || '0,0').split(',').map(Number)
      return {
        country: data.country || 'Desconhecido',
        city: data.city || 'Desconhecido',
        countryCode: data.country || 'XX',
        continent: getContinentFromCode(data.country || 'XX'),
        latitude: lat || undefined,
        longitude: lon || undefined
      }
    },
    rateLimit: 1000,
    maxRetries: 1
  }
]

export async function getGeoLocationFromIP(ip: string): Promise<GeoLocationData> {
  // Verificar se é IP local
  if (isLocalIP(ip)) {
    return {
      country: 'Local',
      city: 'Rede Local',
      countryCode: 'LOCAL',
      continent: 'Local'
    }
  }

  // Verificar cache
  const cached = getCachedGeoData(ip)
  if (cached) {
    return cached
  }

  // Tentar cada provider até obter sucesso
  for (const provider of API_PROVIDERS) {
    try {
      const result = await tryProvider(provider, ip)
      if (result) {
        // Armazenar no cache
        setCachedGeoData(ip, result)
        logger.info(`Geolocalização obtida com sucesso usando ${provider.name}`, { ip, country: result.country })
        return result
      }
    } catch (error) {
      logger.warn(`Falha no provider ${provider.name} para IP ${ip}:`, error)
      continue
    }
  }

  // Se todos os providers falharam, retornar dados padrão
  logger.error(`Todos os providers de geolocalização falharam para IP: ${ip}`)
  return getDefaultGeoData()
}

async function tryProvider(provider: ApiProvider, ip: string): Promise<GeoLocationData | null> {
  // Rate limiting por provider
  const now = Date.now()
  const lastRequest = lastRequestTimes.get(provider.name) || 0
  
  if (now - lastRequest < provider.rateLimit) {
    await new Promise(resolve => setTimeout(resolve, provider.rateLimit - (now - lastRequest)))
  }
  
  lastRequestTimes.set(provider.name, Date.now())

  let retries = 0
  while (retries <= provider.maxRetries) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(provider.url(ip), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CDNProxy-Analytics/1.0'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const result = provider.parseResponse(data)
      
      if (result) {
        return result
      } else {
        throw new Error('Provider returned invalid data')
      }

    } catch (error: any) {
      retries++
      if (retries > provider.maxRetries) {
        throw error
      }
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * retries))
    }
  }

  return null
}

function isLocalIP(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true
  }
  
  // Verificar ranges de IP privados
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  )
}

function getCachedGeoData(ip: string): GeoLocationData | null {
  const cached = geoCache.get(ip)
  const timestamp = cacheTimestamps.get(ip)
  
  if (cached && timestamp && (Date.now() - timestamp) < CACHE_DURATION) {
    return cached
  }
  
  // Remover cache expirado
  if (cached) {
    geoCache.delete(ip)
    cacheTimestamps.delete(ip)
  }
  
  return null
}

function setCachedGeoData(ip: string, data: GeoLocationData): void {
  geoCache.set(ip, data)
  cacheTimestamps.set(ip, Date.now())
  
  // Limpar cache antigo periodicamente (manter apenas os últimos 1000 IPs)
  if (geoCache.size > 1000) {
    const oldestEntries = Array.from(cacheTimestamps.entries())
      .sort(([,a], [,b]) => a - b)
      .slice(0, 200) // Remover os 200 mais antigos
    
    oldestEntries.forEach(([ip]) => {
      geoCache.delete(ip)
      cacheTimestamps.delete(ip)
    })
  }
}

function getContinentFromCode(continentOrCountryCode: string): string {
  // Primeiro, tentar como código de continente
  const continentMap: Record<string, string> = {
    'AF': 'África',
    'AN': 'Antártica', 
    'AS': 'Ásia',
    'EU': 'Europa',
    'NA': 'América do Norte',
    'OC': 'Oceania',
    'SA': 'América do Sul'
  }
  
  if (continentMap[continentOrCountryCode]) {
    return continentMap[continentOrCountryCode]
  }
  
  // Se não encontrou, tentar mapear código do país para continente
  const countryToContinentMap: Record<string, string> = {
    // América do Sul
    'BR': 'América do Sul',
    'AR': 'América do Sul',
    'CL': 'América do Sul',
    'CO': 'América do Sul',
    'PE': 'América do Sul',
    'VE': 'América do Sul',
    'UY': 'América do Sul',
    'PY': 'América do Sul',
    'BO': 'América do Sul',
    'EC': 'América do Sul',
    'GY': 'América do Sul',
    'SR': 'América do Sul',
    'GF': 'América do Sul',
    
    // América do Norte
    'US': 'América do Norte',
    'CA': 'América do Norte',
    'MX': 'América do Norte',
    'GT': 'América do Norte',
    'BZ': 'América do Norte',
    'SV': 'América do Norte',
    'HN': 'América do Norte',
    'NI': 'América do Norte',
    'CR': 'América do Norte',
    'PA': 'América do Norte',
    'CU': 'América do Norte',
    'JM': 'América do Norte',
    'HT': 'América do Norte',
    'DO': 'América do Norte',
    
    // Europa
    'GB': 'Europa',
    'DE': 'Europa',
    'FR': 'Europa',
    'IT': 'Europa',
    'ES': 'Europa',
    'PT': 'Europa',
    'NL': 'Europa',
    'BE': 'Europa',
    'CH': 'Europa',
    'AT': 'Europa',
    'SE': 'Europa',
    'NO': 'Europa',
    'DK': 'Europa',
    'FI': 'Europa',
    'PL': 'Europa',
    'CZ': 'Europa',
    'SK': 'Europa',
    'HU': 'Europa',
    'RO': 'Europa',
    'BG': 'Europa',
    'GR': 'Europa',
    'HR': 'Europa',
    'SI': 'Europa',
    'EE': 'Europa',
    'LV': 'Europa',
    'LT': 'Europa',
    'IE': 'Europa',
    'IS': 'Europa',
    'LU': 'Europa',
    'MT': 'Europa',
    'CY': 'Europa',
    
    // Ásia
    'RU': 'Ásia',
    'CN': 'Ásia',
    'JP': 'Ásia',
    'KR': 'Ásia',
    'IN': 'Ásia',
    'TH': 'Ásia',
    'VN': 'Ásia',
    'ID': 'Ásia',
    'MY': 'Ásia',
    'SG': 'Ásia',
    'PH': 'Ásia',
    'BD': 'Ásia',
    'PK': 'Ásia',
    'LK': 'Ásia',
    'MM': 'Ásia',
    'KH': 'Ásia',
    'LA': 'Ásia',
    'BN': 'Ásia',
    'MN': 'Ásia',
    'KZ': 'Ásia',
    'UZ': 'Ásia',
    'TM': 'Ásia',
    'KG': 'Ásia',
    'TJ': 'Ásia',
    'AF': 'Ásia',
    'IR': 'Ásia',
    'IQ': 'Ásia',
    'SY': 'Ásia',
    'JO': 'Ásia',
    'LB': 'Ásia',
    'IL': 'Ásia',
    'PS': 'Ásia',
    'SA': 'Ásia',
    'AE': 'Ásia',
    'QA': 'Ásia',
    'KW': 'Ásia',
    'BH': 'Ásia',
    'OM': 'Ásia',
    'YE': 'Ásia',
    'TR': 'Ásia',
    'GE': 'Ásia',
    'AM': 'Ásia',
    'AZ': 'Ásia',
    
    // Oceania
    'AU': 'Oceania',
    'NZ': 'Oceania',
    'FJ': 'Oceania',
    'PG': 'Oceania',
    'NC': 'Oceania',
    'SB': 'Oceania',
    'VU': 'Oceania',
    'WS': 'Oceania',
    'TO': 'Oceania',
    'TV': 'Oceania',
    'NR': 'Oceania',
    'KI': 'Oceania',
    'MH': 'Oceania',
    'FM': 'Oceania',
    'PW': 'Oceania',
    
    // África
    'ZA': 'África',
    'EG': 'África',
    'NG': 'África',
    'KE': 'África',
    'MA': 'África',
    'DZ': 'África',
    'TN': 'África',
    'LY': 'África',
    'SD': 'África',
    'ET': 'África',
    'UG': 'África',
    'TZ': 'África',
    'MZ': 'África',
    'MG': 'África',
    'AO': 'África',
    'GH': 'África',
    'CM': 'África',
    'CI': 'África',
    'NE': 'África',
    'BF': 'África',
    'ML': 'África',
    'MW': 'África',
    'ZM': 'África',
    'ZW': 'África',
    'BW': 'África',
    'NA': 'África',
    'LS': 'África',
    'SZ': 'África',
    'RW': 'África',
    'BI': 'África',
    'DJ': 'África',
    'SO': 'África',
    'ER': 'África',
    'CF': 'África',
    'TD': 'África',
    'CG': 'África',
    'CD': 'África',
    'GA': 'África',
    'GQ': 'África',
    'ST': 'África',
    'CV': 'África',
    'GN': 'África',
    'GW': 'África',
    'SL': 'África',
    'LR': 'África',
    'SN': 'África',
    'GM': 'África',
    'MR': 'África'
  }
  
  return countryToContinentMap[continentOrCountryCode] || 'Desconhecido'
}

function getDefaultGeoData(): GeoLocationData {
  return {
    country: 'Desconhecido',
    city: 'Desconhecido',
    countryCode: 'XX',
    continent: 'Desconhecido'
  }
}

// Função auxiliar para obter flag do país
export function getCountryFlag(countryCode: string): string {
  if (countryCode === 'LOCAL') return '🏠'
  if (countryCode === 'XX') return '🌍'
  
  // Converter código do país para emoji de bandeira
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  
  return String.fromCodePoint(...codePoints)
}

// Função auxiliar para obter coordenadas aproximadas do país
export function getCountryCoordinates(countryCode: string): [number, number] {
  const coordMap: Record<string, [number, number]> = {
    'BR': [-14.2350, -51.9253],
    'US': [39.8283, -98.5795],
    'GB': [55.3781, -3.4360],
    'DE': [51.1657, 10.4515],
    'FR': [46.2276, 2.2137],
    'CA': [56.1304, -106.3468],
    'AU': [-25.2744, 133.7751],
    'AR': [-38.4161, -63.6167],
    'MX': [23.6345, -102.5528],
    'JP': [36.2048, 138.2529],
    'CN': [35.8617, 104.1954],
    'IN': [20.5937, 78.9629],
    'RU': [61.5240, 105.3188],
    'LOCAL': [0, 0]
  }
  
  return coordMap[countryCode] || [0, 0]
}