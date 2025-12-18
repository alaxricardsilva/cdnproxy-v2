const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Só criar o cliente se as variáveis estiverem configuradas
let supabase = null;
if (supabaseUrl !== 'https://jyconxalcfqvqakrswnb.supabase.co' && supabaseKey !== 'placeholder-key') {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Cache em memória para evitar múltiplas consultas do mesmo IP
const geoCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// IPs de servidores que devem ser filtrados
const SERVER_IPS = [
  '194.163.131.9',
  '2a02:c207:2241:5964::1',
  '102.216.82.183',
  '2a0c:b641:70:1000::d548:b78e'
];

// Função para detectar se é um IP que deve ser filtrado
function shouldFilterIP(ip) {
  if (!ip || ip === 'unknown' || ip === 'null') return true;
  
  // IPs de servidores específicos
  if (SERVER_IPS.includes(ip)) return true;
  
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
  ];
  
  return privateRanges.some(range => range.test(ip));
}

async function getGeolocationFromAPI(ip) {
  const apis = [
    {
      name: 'ip-api.com',
      url: `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      parser: (data) => {
        if (data.status === 'success') {
          return {
            country: data.country || 'Unknown',
            city: data.city || 'Unknown',
            region: data.regionName || data.region || 'Unknown',
            countryCode: data.countryCode || 'XX',
            latitude: data.lat || 0,
            longitude: data.lon || 0,
            timezone: data.timezone || 'UTC',
            isp: data.isp || 'Unknown',
            org: data.org || 'Unknown',
            as: data.as || 'Unknown'
          };
        }
        return null;
      }
    },
    {
      name: 'ipapi.co',
      url: `https://ipapi.co/${ip}/json/`,
      parser: (data) => {
        if (data.error) return null;
        return {
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          countryCode: data.country_code || 'XX',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          timezone: data.timezone || 'UTC',
          isp: data.org || 'Unknown',
          org: data.org || 'Unknown',
          as: data.asn || 'Unknown'
        };
      }
    },
    {
      name: 'ipinfo.io',
      url: `https://ipinfo.io/${ip}/json`,
      parser: (data) => {
        if (data.error) return null;
        const [lat, lon] = (data.loc || '0,0').split(',');
        return {
          country: 'Unknown', // ipinfo.io não retorna nome completo do país
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          countryCode: data.country || 'XX',
          latitude: parseFloat(lat) || 0,
          longitude: parseFloat(lon) || 0,
          timezone: data.timezone || 'UTC',
          isp: data.org || 'Unknown',
          org: data.org || 'Unknown',
          as: data.org || 'Unknown'
        };
      }
    }
  ];

  for (const api of apis) {
    try {
      console.log(`🌍 [GEOLOCATION] Consultando ${api.name} para IP: ${ip}`);
      
      const response = await fetch(api.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'ProxyCDN-Analytics/1.0'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ [GEOLOCATION] ${api.name} retornou status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const result = api.parser(data);

      if (result) {
        console.log(`✅ [GEOLOCATION] Sucesso com ${api.name}:`, result);
        return result;
      }

    } catch (error) {
      console.warn(`⚠️ [GEOLOCATION] Erro ao consultar ${api.name}:`, error.message);
    }
  }

  console.warn(`❌ [GEOLOCATION] Todas as APIs falharam para IP: ${ip}`);
  return null;
}

async function getGeolocationFromCache(ip) {
  if (!supabase) {
    console.warn('⚠️ [GEOLOCATION] Supabase não configurado, usando apenas cache em memória');
    const cached = geoCache.get(ip);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 [GEOLOCATION] Cache em memória HIT para IP: ${ip}`);
      return cached.data;
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .eq('ip', ip)
      .gte('created_at', new Date(Date.now() - CACHE_TTL).toISOString())
      .single();

    if (error || !data) {
      console.log(`📦 [GEOLOCATION] Cache MISS para IP: ${ip}`);
      return null;
    }

    console.log(`📦 [GEOLOCATION] Cache HIT para IP: ${ip}`);
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
      as: data.as || 'Unknown'
    };

  } catch (error) {
    console.warn('⚠️ [GEOLOCATION] Erro ao consultar cache:', error.message);
    return null;
  }
}

async function saveGeolocationToCache(ip, geo) {
  // Salvar no cache em memória
  geoCache.set(ip, {
    data: geo,
    timestamp: Date.now()
  });

  if (!supabase) return;

  try {
    await supabase
      .from('ip_geo_cache')
      .upsert({
        ip,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        country_code: geo.countryCode,
        latitude: geo.latitude || 0,
        longitude: geo.longitude || 0,
        timezone: geo.timezone || 'UTC',
        isp: geo.isp || 'Unknown',
        org: geo.org || 'Unknown',
        as: geo.as || 'Unknown',
        created_at: new Date().toISOString()
      });

    console.log(`💾 [GEOLOCATION] Salvo no cache para IP: ${ip}`);
  } catch (error) {
    console.warn('⚠️ [GEOLOCATION] Erro ao salvar no cache:', error.message);
  }
}

async function getGeolocation(ip) {
  try {
    // Validar IP
    if (!ip || typeof ip !== 'string') {
      console.warn('⚠️ [GEOLOCATION] IP inválido:', ip);
      return {
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        countryCode: 'XX',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Unknown',
        org: 'Unknown',
        as: 'Unknown'
      };
    }

    // Filtrar IPs que não devem ser geolocalizados
    if (shouldFilterIP(ip)) {
      console.log(`🚫 [GEOLOCATION] IP filtrado: ${ip}`);
      return {
        country: 'Local/Private',
        city: 'Local/Private',
        region: 'Local/Private',
        countryCode: 'XX',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Unknown',
        org: 'Unknown',
        as: 'Unknown'
      };
    }

    console.log(`🔍 [GEOLOCATION] Iniciando geolocalização para IP: ${ip}`);

    // Tentar buscar do cache primeiro
    const cached = await getGeolocationFromCache(ip);
    if (cached) {
      return cached;
    }

    // Se não encontrou no cache, consultar APIs
    const geoData = await getGeolocationFromAPI(ip);
    
    if (geoData) {
      // Salvar no cache para próximas consultas
      await saveGeolocationToCache(ip, geoData);
      return geoData;
    }

    // Se todas as APIs falharam, retornar dados padrão
    console.warn(`❌ [GEOLOCATION] Falha total para IP: ${ip}`);
    return {
      country: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      countryCode: 'XX',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      isp: 'Unknown',
      org: 'Unknown',
      as: 'Unknown'
    };

  } catch (error) {
    console.error('💥 [GEOLOCATION] Erro crítico:', error);
    return {
      country: 'Error',
      city: 'Error',
      region: 'Error',
      countryCode: 'XX',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      isp: 'Unknown',
      org: 'Unknown',
      as: 'Unknown'
    };
  }
}

function clearGeoCache() {
  geoCache.clear();
}

function getGeoCacheStats() {
  return {
    size: geoCache.size,
    keys: Array.from(geoCache.keys())
  };
}

module.exports = {
  getGeolocation,
  clearGeoCache,
  getGeoCacheStats
};