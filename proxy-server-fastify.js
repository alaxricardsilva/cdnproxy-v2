import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import cors from '@fastify/cors';
import { UAParser } from 'ua-parser-js';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/www/wwwroot/CDNProxy_v2/backend/.env' });

const supabaseUrl = process.env.supabaseUrl;
const supabaseKey = process.env.supabaseKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis supabaseUrl e supabaseKey são obrigatórias. Verifique o arquivo .env.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fastify = Fastify({ logger: true });

// Registrar plugins
fastify.register(formbody);
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
});

const PORT = process.env.PORT || 8080;

/**
 * Função para detectar mudanças de episódio
 */
function detectEpisodeChange(realIP, reqUrl, userAgent) {
  return {
    changeType: 'new_episode',
    episodeChanged: false,
    currentEpisode: null,
    previousEpisode: null,
    sessionId: null,
    accessCount: 0
  };
}

/**
 * Função para coletar log de acesso
 */
async function collectAccessLog(accessLogData) {
  try {
    await supabase
      .from('access_logs')
      .insert(accessLogData);

    console.log(`📈 [PROXY] Analytics registrado para streaming - IP: ${accessLogData.client_ip}`);
  } catch (err) {
    console.error('⚠️ [PROXY] Erro ao registrar analytics:', err.message);
  }
}

/**
 * Função para obter geolocalização com múltiplas APIs
 */
async function getGeolocation(ip) {
  const apis = [
    `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp`,
    `https://ipwhois.app/json/${ip}`
  ];

  for (const api of apis) {
    try {
      const response = await fetch(api, { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' || data.country) {
          return {
            country: data.country || 'Unknown',
            countryCode: data.countryCode || 'XX',
            region: data.region || 'Unknown',
            city: data.city || 'Unknown',
            latitude: data.lat || 0,
            longitude: data.lon || 0,
            timezone: data.timezone || 'UTC',
            isp: data.isp || 'Unknown'
          };
        }
      }
    } catch (error) {
      console.warn(`⚠️ [GEO] Erro ao consultar API: ${api}`, error.message);
    }
  }

  console.error('❌ [GEO] Todas as APIs de geolocalização falharam');
  return null;
}

/**
 * Busca geolocalização do cache
 */
async function getGeolocalizationFromCache(ip) {
  try {
    const { data, error } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .eq('ip', ip)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      country: data.country,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      timezone: data.timezone || 'UTC',
      isp: data.isp || 'Unknown'
    };
  } catch (error) {
    console.warn('⚠️ [GEO] Erro ao consultar cache:', error.message);
    return null;
  }
}

/**
 * Salva geolocalização no cache
 */
async function saveGeolocationToCache(ip, geoData) {
  try {
    await supabase
      .from('ip_geo_cache')
      .upsert({
        ip,
        country: geoData.country,
        country_code: geoData.countryCode,
        region: geoData.region,
        city: geoData.city,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        timezone: geoData.timezone,
        isp: geoData.isp,
        created_at: new Date().toISOString()
      });

    console.log(`💾 [GEO] Salvo no cache para IP: ${ip}`);
  } catch (error) {
    console.warn('⚠️ [GEO] Erro ao salvar no cache:', error.message);
  }
}

/**
 * Detecta dispositivo
 */
function detectDevice(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = result.device.type || 'desktop';
  const appName = result.browser.name || 'Unknown';

  return {
    type: deviceType,
    appName,
    isBot: deviceType === 'bot'
  };
}

/**
 * Gera página de status
 */
function generateStatusPage(domain, statusInfo) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Status do Domínio - ${domain}</title>
    </head>
    <body>
      <h1>Status do Domínio: ${domain}</h1>
      <p>Status: ${statusInfo.status}</p>
    </body>
    </html>
  `;
}

// Rotas
fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'ok' });
});

fastify.get('/detect-device', async (request, reply) => {
  const userAgent = request.headers['user-agent'];
  const deviceInfo = detectDevice(userAgent);
  reply.send(deviceInfo);
});

fastify.get('/status', async (request, reply) => {
  const domain = request.query.domain || 'example.com';
  const statusInfo = { status: 'Ativo' };
  const page = generateStatusPage(domain, statusInfo);
  reply.type('text/html').send(page);
});

fastify.listen({ port: PORT }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${address}`);
});

const JWT_SIGNING_KEYS = 'https://hbiusfcqllxdhkatpjgf.supabase.co/auth/v1/.well-known/jwks.json';
const PUBLISHABLE_KEY = 'sb_publishable_Hy_UMwdaXXnBubpmp93Yxg_gSuq7ecA';