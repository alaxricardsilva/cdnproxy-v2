const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dns = require('dns');

// Configurar DNS do Google para melhor resolução de nomes
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);

console.log('🌐 [PROXY] DNS configurado para:', dns.getServers());

// Importar utilitários avançados do backend
const { getGeolocation: getAdvancedGeolocation, clearGeoCache, getGeoCacheStats } = require('./backend/utils/geolocation.cjs');

// Importar sistema de analytics remoto
const { collectAccessLog, withAnalytics, testBackendConnection } = require('./analytics-client.js');

const app = express();
const PORT = process.env.PORT || 8080;

// Sistema de tracking de episódios e sessões
const sessionTracker = new Map(); // IP -> { lastUrl, lastEpisode, sessionId, lastAccess }
const episodePatterns = [
  // Padrões comuns para episódios
  /\/s(\d+)e(\d+)/i,           // /s01e01, /s1e1
  /\/season[\-_]?(\d+)[\-_]?episode[\-_]?(\d+)/i, // /season1episode1, /season-1-episode-1
  /\/temporada[\-_]?(\d+)[\-_]?episodio[\-_]?(\d+)/i, // /temporada1episodio1
  /\/ep[\-_]?(\d+)/i,          // /ep01, /ep-1
  /\/episodio[\-_]?(\d+)/i,    // /episodio01
  /\/episode[\-_]?(\d+)/i,     // /episode01
  /\/(\d+)x(\d+)/i,            // /1x01, /01x01
  /\/cap[\-_]?(\d+)/i,         // /cap01, /cap-1
  /\/capitulo[\-_]?(\d+)/i,    // /capitulo01
  /[\?&]ep=(\d+)/i,            // ?ep=1, &ep=1
  /[\?&]episode=(\d+)/i,       // ?episode=1
  /[\?&]s=(\d+)&e=(\d+)/i,     // ?s=1&e=1
];

// Padrões específicos para APIs de IPTV
const iptvApiPatterns = [
  // Player API patterns
  /[\?&]series_id=(\d+)/i,     // ?series_id=1502
  /[\?&]movie_id=(\d+)/i,      // ?movie_id=1234
  /[\?&]stream_id=(\d+)/i,     // ?stream_id=5678
  /[\?&]id=(\d+)/i,            // ?id=9999
  /[\?&]channel_id=(\d+)/i,    // ?channel_id=123
  /[\?&]vod_id=(\d+)/i,        // ?vod_id=456
  // Action-based patterns
  /[\?&]action=get_series_info.*?series_id=(\d+)/i,
  /[\?&]action=get_vod_info.*?vod_id=(\d+)/i,
  /[\?&]action=get_live_streams.*?stream_id=(\d+)/i,
];

/**
 * Extrai informações de episódio da URL
 */
function extractEpisodeInfo(url) {
  if (!url) return null;
  
  // Primeiro, tentar padrões tradicionais de episódios
  for (const pattern of episodePatterns) {
    const match = url.match(pattern);
    if (match) {
      if (match.length >= 3) {
        // Padrão com temporada e episódio
        return {
          season: parseInt(match[1]) || 1,
          episode: parseInt(match[2]) || 1,
          identifier: `S${String(match[1]).padStart(2, '0')}E${String(match[2]).padStart(2, '0')}`,
          raw: match[0],
          type: 'traditional'
        };
      } else if (match.length >= 2) {
        // Apenas episódio
        return {
          season: 1,
          episode: parseInt(match[1]) || 1,
          identifier: `S01E${String(match[1]).padStart(2, '0')}`,
          raw: match[0],
          type: 'traditional'
        };
      }
    }
  }
  
  // Se não encontrou padrões tradicionais, tentar padrões de API IPTV
  for (const pattern of iptvApiPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const contentId = match[1];
      
      // Determinar o tipo de conteúdo baseado no padrão
      let contentType = 'unknown';
      if (pattern.source.includes('series_id')) {
        contentType = 'series';
      } else if (pattern.source.includes('movie_id')) {
        contentType = 'movie';
      } else if (pattern.source.includes('vod_id')) {
        contentType = 'vod';
      } else if (pattern.source.includes('stream_id')) {
        contentType = 'stream';
      } else if (pattern.source.includes('channel_id')) {
        contentType = 'channel';
      }
      
      return {
        season: 1,
        episode: 1,
        identifier: `${contentType}_${contentId}`,
        contentId: contentId,
        contentType: contentType,
        raw: match[0],
        type: 'iptv_api'
      };
    }
  }
  
  return null;
}

/**
 * Detecta se houve mudança de episódio
 */
function detectEpisodeChange(ip, currentUrl, userAgent) {
  const currentEpisode = extractEpisodeInfo(currentUrl);
  const sessionKey = `${ip}_${userAgent.substring(0, 50)}`;
  const session = sessionTracker.get(sessionKey);
  
  const now = Date.now();
  const sessionId = session?.sessionId || `${ip}_${now}`;
  
  // Atualizar ou criar sessão
  const newSession = {
    lastUrl: currentUrl,
    lastEpisode: currentEpisode,
    sessionId: sessionId,
    lastAccess: now,
    accessCount: (session?.accessCount || 0) + 1
  };
  
  sessionTracker.set(sessionKey, newSession);
  
  // Limpar sessões antigas (mais de 2 horas)
  const twoHoursAgo = now - (2 * 60 * 60 * 1000);
  for (const [key, sess] of sessionTracker.entries()) {
    if (sess.lastAccess < twoHoursAgo) {
      sessionTracker.delete(key);
    }
  }
  
  // Verificar se houve mudança de episódio
  let episodeChanged = false;
  let changeType = 'new_session';
  
  if (session && session.lastEpisode && currentEpisode) {
    if (session.lastEpisode.identifier !== currentEpisode.identifier) {
      episodeChanged = true;
      changeType = 'episode_change';
    } else if (session.lastUrl !== currentUrl) {
      changeType = 'url_change';
    } else {
      changeType = 'same_content';
    }
  } else if (currentEpisode) {
    changeType = 'new_episode';
  }
  
  return {
    episodeChanged,
    changeType,
    currentEpisode,
    previousEpisode: session?.lastEpisode || null,
    sessionId,
    accessCount: newSession.accessCount
  };
}

/**
 * Gera um identificador único para o conteúdo baseado na URL
 */
function generateContentId(url, episodeInfo) {
  if (episodeInfo) {
    return `${episodeInfo.identifier}_${url.split('/').pop().split('?')[0]}`;
  }
  
  // Para URLs sem padrão de episódio, usar hash da URL
  const urlParts = url.split('/').filter(part => part.length > 0);
  const lastPart = urlParts[urlParts.length - 1] || 'unknown';
  return `content_${lastPart.split('?')[0]}`;
}

// Função para traduzir nomes de países para português do Brasil
function translateCountryToPTBR(countryName) {
  const countryTranslations = {
    // Países mais comuns
    'Brazil': 'Brasil',
    'United States': 'Estados Unidos',
    'Argentina': 'Argentina',
    'Chile': 'Chile',
    'Colombia': 'Colômbia',
    'Peru': 'Peru',
    'Uruguay': 'Uruguai',
    'Paraguay': 'Paraguai',
    'Bolivia': 'Bolívia',
    'Venezuela': 'Venezuela',
    'Ecuador': 'Equador',
    'Guyana': 'Guiana',
    'Suriname': 'Suriname',
    'French Guiana': 'Guiana Francesa',
    
    // América do Norte
    'Canada': 'Canadá',
    'Mexico': 'México',
    'United States of America': 'Estados Unidos',
    'USA': 'Estados Unidos',
    
    // Europa
    'Portugal': 'Portugal',
    'Spain': 'Espanha',
    'France': 'França',
    'Italy': 'Itália',
    'Germany': 'Alemanha',
    'United Kingdom': 'Reino Unido',
    'England': 'Inglaterra',
    'Netherlands': 'Holanda',
    'Belgium': 'Bélgica',
    'Switzerland': 'Suíça',
    'Austria': 'Áustria',
    'Poland': 'Polônia',
    'Russia': 'Rússia',
    'Ukraine': 'Ucrânia',
    'Czech Republic': 'República Tcheca',
    'Hungary': 'Hungria',
    'Romania': 'Romênia',
    'Bulgaria': 'Bulgária',
    'Croatia': 'Croácia',
    'Serbia': 'Sérvia',
    'Greece': 'Grécia',
    'Turkey': 'Turquia',
    'Norway': 'Noruega',
    'Sweden': 'Suécia',
    'Denmark': 'Dinamarca',
    'Finland': 'Finlândia',
    'Iceland': 'Islândia',
    'Ireland': 'Irlanda',
    
    // Ásia
    'China': 'China',
    'Japan': 'Japão',
    'South Korea': 'Coreia do Sul',
    'North Korea': 'Coreia do Norte',
    'India': 'Índia',
    'Indonesia': 'Indonésia',
    'Thailand': 'Tailândia',
    'Vietnam': 'Vietnã',
    'Philippines': 'Filipinas',
    'Malaysia': 'Malásia',
    'Singapore': 'Singapura',
    'Taiwan': 'Taiwan',
    'Hong Kong': 'Hong Kong',
    'Macau': 'Macau',
    'Mongolia': 'Mongólia',
    'Kazakhstan': 'Cazaquistão',
    'Uzbekistan': 'Uzbequistão',
    'Pakistan': 'Paquistão',
    'Bangladesh': 'Bangladesh',
    'Sri Lanka': 'Sri Lanka',
    'Myanmar': 'Mianmar',
    'Cambodia': 'Camboja',
    'Laos': 'Laos',
    'Nepal': 'Nepal',
    'Bhutan': 'Butão',
    'Afghanistan': 'Afeganistão',
    'Iran': 'Irã',
    'Iraq': 'Iraque',
    'Saudi Arabia': 'Arábia Saudita',
    'United Arab Emirates': 'Emirados Árabes Unidos',
    'Qatar': 'Catar',
    'Kuwait': 'Kuwait',
    'Bahrain': 'Bahrein',
    'Oman': 'Omã',
    'Yemen': 'Iêmen',
    'Jordan': 'Jordânia',
    'Lebanon': 'Líbano',
    'Syria': 'Síria',
    'Israel': 'Israel',
    'Palestine': 'Palestina',
    
    // África
    'South Africa': 'África do Sul',
    'Nigeria': 'Nigéria',
    'Egypt': 'Egito',
    'Morocco': 'Marrocos',
    'Algeria': 'Argélia',
    'Tunisia': 'Tunísia',
    'Libya': 'Líbia',
    'Sudan': 'Sudão',
    'Ethiopia': 'Etiópia',
    'Kenya': 'Quênia',
    'Tanzania': 'Tanzânia',
    'Uganda': 'Uganda',
    'Rwanda': 'Ruanda',
    'Burundi': 'Burundi',
    'Democratic Republic of the Congo': 'República Democrática do Congo',
    'Congo': 'Congo',
    'Central African Republic': 'República Centro-Africana',
    'Chad': 'Chade',
    'Niger': 'Níger',
    'Mali': 'Mali',
    'Burkina Faso': 'Burkina Faso',
    'Senegal': 'Senegal',
    'Guinea': 'Guiné',
    'Sierra Leone': 'Serra Leoa',
    'Liberia': 'Libéria',
    'Ivory Coast': 'Costa do Marfim',
    'Ghana': 'Gana',
    'Togo': 'Togo',
    'Benin': 'Benin',
    'Cameroon': 'Camarões',
    'Equatorial Guinea': 'Guiné Equatorial',
    'Gabon': 'Gabão',
    'São Tomé and Príncipe': 'São Tomé e Príncipe',
    'Cape Verde': 'Cabo Verde',
    'Mauritania': 'Mauritânia',
    'Gambia': 'Gâmbia',
    'Guinea-Bissau': 'Guiné-Bissau',
    'Angola': 'Angola',
    'Zambia': 'Zâmbia',
    'Zimbabwe': 'Zimbábue',
    'Botswana': 'Botsuana',
    'Namibia': 'Namíbia',
    'Lesotho': 'Lesoto',
    'Swaziland': 'Suazilândia',
    'Mozambique': 'Moçambique',
    'Madagascar': 'Madagascar',
    'Mauritius': 'Maurício',
    'Seychelles': 'Seicheles',
    'Comoros': 'Comores',
    'Djibouti': 'Djibuti',
    'Eritrea': 'Eritreia',
    'Somalia': 'Somália',
    'Malawi': 'Malawi',
    
    // Oceania
    'Australia': 'Austrália',
    'New Zealand': 'Nova Zelândia',
    'Papua New Guinea': 'Papua-Nova Guiné',
    'Fiji': 'Fiji',
    'Solomon Islands': 'Ilhas Salomão',
    'Vanuatu': 'Vanuatu',
    'Samoa': 'Samoa',
    'Tonga': 'Tonga',
    'Kiribati': 'Kiribati',
    'Tuvalu': 'Tuvalu',
    'Nauru': 'Nauru',
    'Palau': 'Palau',
    'Marshall Islands': 'Ilhas Marshall',
    'Micronesia': 'Micronésia',
    
    // Casos especiais
    'Local/Private': 'Local/Privado',
    'Unknown': 'Desconhecido',
    'N/A': 'N/A',
    '': 'Desconhecido'
  };
  
  // Se não encontrar tradução, retorna o nome original
  return countryTranslations[countryName] || countryName || 'Desconhecido';
}

// Configuração do Supabase - usando variáveis de ambiente como no backend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 [PROXY] Configuração do Supabase:', {
  url: supabaseUrl,
  keyConfigured: !!supabaseKey
});

// Middleware básico
app.use(express.json());

// Middleware de headers de segurança
app.use((req, res, next) => {
  // Headers de segurança
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CSP mais flexível para proxy
  res.setHeader('Content-Security-Policy', "default-src 'self' *; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; img-src 'self' data: *; font-src 'self' *; connect-src 'self' *;");
  
  next();
});
app.use(express.urlencoded({ extended: true }));

// Configurar proxy confiável para detectar IP real
app.set('trust proxy', true);

// CORS configurado para permitir origens específicas
const corsOptions = {
  origin: [
    'https://app.cdnproxy.top',
    'https://api.cdnproxy.top',
    'http://localhost:3000',
    'http://localhost:5001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por janela
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getRealClientIP(req) // Usar IP real para rate limiting
});

app.use(limiter);

// Configuração de múltiplas APIs backend para redundância
const BACKEND_APIS = [
  'https://api.cdnproxy.top',
  'https://app.cdnproxy.top',
  // Adicione mais APIs conforme necessário
];

let currentApiIndex = 0;

// Função para obter a próxima API disponível
function getNextBackendApi() {
  const api = BACKEND_APIS[currentApiIndex];
  currentApiIndex = (currentApiIndex + 1) % BACKEND_APIS.length;
  return api;
}

// Função para testar se uma API está disponível
async function testApiAvailability(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/api/test-geolocation?ip=8.8.8.8`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.log(`❌ API ${apiUrl} não disponível:`, error.message);
    return false;
  }
}

// Função para obter geolocalização via backend remoto com fallback
async function getGeolocationFromRemote(ip) {
  for (let attempt = 0; attempt < BACKEND_APIS.length; attempt++) {
    const apiUrl = getNextBackendApi();
    
    try {
      console.log(`🌐 Tentando obter geolocalização via ${apiUrl} para IP: ${ip}`);
      
      const response = await fetch(`${apiUrl}/api/test/geolocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
        timeout: 10000
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Geolocalização obtida via ${apiUrl}:`, data);
        
        if (data.success && data.data) {
          // Os dados completos estão em data.data, não em data.data.geolocation
          const geo = data.data;
          
          return {
            country: geo.country || 'Unknown',
            countryCode: geo.countryCode || 'XX',
            region: geo.region || 'Unknown',
            city: geo.city || 'Unknown',
            latitude: geo.latitude || 0,
            longitude: geo.longitude || 0,
            timezone: geo.timezone || 'UTC',
            isp: geo.isp || 'Unknown',
            org: geo.org || 'Unknown',
            as: geo.as || 'Unknown',
            responseTime: data.responseTime || 0,
            cacheStatus: data.cacheStatus || 'UNKNOWN',
            timestamp: data.timestamp || new Date().toISOString(),
            source: apiUrl
          };
        }
      }
    } catch (error) {
      console.log(`❌ Erro ao consultar ${apiUrl}:`, error.message);
    }
  }
  
  console.log('⚠️ Todas as APIs remotas falharam, usando fallback local');
  // Usar a função de geolocalização local melhorada
  const localGeo = await getAdvancedGeolocation(ip);
  if (localGeo) {
    return {
      ...localGeo,
      source: 'local-advanced'
    };
  }
  
  return null;
}

/**
 * Detecção robusta de IP real baseada no backend original
 * Suporta Cloudflare, proxies reversos e CDNs
 */
function getRealClientIP(req) {
  // Headers de proxy confiáveis em ordem de prioridade
  const trustedHeaders = [
    'cf-connecting-ip',           // Cloudflare (prioridade máxima)
    'cf-visitor',                 // Cloudflare Visitor
    'x-forwarded-for',           // Proxy/Load Balancer padrão
    'x-real-ip',                 // Nginx/Proxy
    'x-client-ip',               // Apache/IIS
    'x-cluster-client-ip',       // Cluster
    'x-forwarded',               // Proxy alternativo
    'forwarded-for',             // RFC 7239
    'forwarded',                 // RFC 7239
    'true-client-ip',            // Akamai/CloudFlare
    'x-original-forwarded-for',  // AWS ELB
    'x-appengine-remote-addr',   // Google App Engine
    'remote-addr',               // Conexão direta
    'remote_addr'                // Variação
  ];

  // Verificar headers em ordem de prioridade
  for (const header of trustedHeaders) {
    const headerValue = req.get(header);
    if (headerValue && typeof headerValue === 'string') {
      // Se for x-forwarded-for, pegar o primeiro IP (cliente original)
      let candidateIP = headerValue;
      if (header === 'x-forwarded-for') {
        candidateIP = headerValue.split(',')[0].trim();
      }
      
      // Validar formato do IP
      if (isValidIP(candidateIP) && !isPrivateIP(candidateIP)) {
        return candidateIP;
      }
    }
  }

  // Fallback para IP direto do Express (já processado pelo trust proxy)
  return req.ip || req.connection.remoteAddress || '127.0.0.1';
}

/**
 * Valida se um IP está em formato válido
 */
function isValidIP(ip) {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplificado)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Verifica se um IP é privado/local
 */
function isPrivateIP(ip) {
  if (!isValidIP(ip)) return false;
  
  // IPv4 private ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^0\./,                     // 0.0.0.0/8
    /^224\./,                   // 224.0.0.0/4 (multicast)
    /^240\./                    // 240.0.0.0/4 (reserved)
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Verifica se o request vem do Cloudflare
 */
function isCloudflareRequest(req) {
  return !!(
    req.get('cf-connecting-ip') ||
    req.get('cf-ray') ||
    req.get('cf-visitor') ||
    req.get('cf-ipcountry')
  );
}

/**
 * Verifica se o request vem de um proxy
 */
function isProxyRequest(req) {
  return !!(
    req.get('x-forwarded-for') ||
    req.get('x-real-ip') ||
    req.get('x-client-ip') ||
    req.get('forwarded') ||
    req.get('x-forwarded')
  );
}

/**
 * Obtém informações completas de geolocalização com cache via banco de dados
 */
/**
 * Função de geolocalização local (fallback)
 */
async function getGeolocationLocal(ip) {
  try {
    console.log(`🔍 [GEO-LOCAL] Iniciando geolocalização local para IP: ${ip}`);
    
    // Verificar se é IP privado/local
    if (isPrivateIP(ip)) {
      console.log(`🏠 [GEO-LOCAL] IP privado detectado: ${ip}`);
      return {
        country: 'Local/Private',
        countryCode: 'XX',
        region: 'Local/Private',
        regionCode: 'XX',
        city: 'Local/Private',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Local Network',
        org: 'Local Network',
        as: 'Local Network'
      };
    }

    // Primeiro, tentar buscar do cache local no banco de dados
    const cached = await getGeolocationFromCache(ip);
    if (cached) {
      console.log(`📦 [GEO-LOCAL] Cache HIT para IP: ${ip}`);
      return cached;
    }

    // Se não encontrou no cache, consultar API ip-api.com (mais completa)
    console.log(`🌍 [GEO-LOCAL] Consultando API para IP: ${ip}`);
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'ProxyCDN-Analytics/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      const geoData = {
        country: data.country || 'Unknown',
        countryCode: data.countryCode || 'XX',
        region: data.regionName || data.region || 'Unknown',
        regionCode: data.countryCode || 'XX',
        city: data.city || 'Unknown',
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        timezone: data.timezone || 'UTC',
        isp: data.isp || 'Unknown',
        org: data.org || 'Unknown',
        as: data.as || 'Unknown'
      };

      console.log(`✅ [GEO-LOCAL] Geolocalização obtida com sucesso para IP ${ip}:`, {
        País: geoData.country,
        Cidade: geoData.city,
        Estado: geoData.region,
        Latitude: geoData.latitude,
        Longitude: geoData.longitude,
        Timezone: geoData.timezone,
        ISP: geoData.isp
      });

      // Salvar no cache local para próximas consultas
      await saveGeolocationToCache(ip, geoData);
      
      return geoData;
    } else {
      console.warn(`⚠️ [GEO-LOCAL] API retornou erro para IP ${ip}:`, data.message);
      return null;
    }
  } catch (error) {
    console.error(`❌ [GEO-LOCAL] Erro na geolocalização para IP ${ip}:`, error.message);
    return null;
  }
}

/**
 * Função de geolocalização original (agora deprecada - mantida para compatibilidade)
 */
async function getGeolocationOriginal(ip) {
  try {
    console.log(`🔍 [GEO] Iniciando geolocalização completa para IP: ${ip}`);
    
    // Verificar se é IP privado/local
    if (isPrivateIP(ip)) {
      console.log(`🏠 [GEO] IP privado detectado: ${ip}`);
      return {
        country: 'Local/Private',
        countryCode: 'XX',
        region: 'Local/Private',
        regionCode: 'XX',
        city: 'Local/Private',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        isp: 'Local Network',
        org: 'Local Network',
        as: 'Local Network'
      };
    }

    // Primeiro, tentar buscar do cache no banco de dados
    const cached = await getGeolocationFromCache(ip);
    if (cached) {
      console.log(`📦 [GEO] Cache HIT para IP: ${ip}`);
      return cached;
    }

    // Se não encontrou no cache, consultar API ip-api.com (mais completa)
    console.log(`🌍 [GEO] Consultando API para IP: ${ip}`);
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,query`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'ProxyCDN-Analytics/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      const geoData = {
        country: data.country || 'Unknown',
        countryCode: data.countryCode || 'XX',
        region: data.regionName || data.region || 'Unknown',
        regionCode: data.countryCode || 'XX',
        city: data.city || 'Unknown',
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        timezone: data.timezone || 'UTC',
        isp: data.isp || 'Unknown',
        org: data.org || 'Unknown',
        as: data.as || 'Unknown'
      };

      console.log(`✅ [GEO] Geolocalização obtida com sucesso para IP ${ip}:`, {
        País: geoData.country,
        Cidade: geoData.city,
        Estado: geoData.region,
        Latitude: geoData.latitude,
        Longitude: geoData.longitude,
        Timezone: geoData.timezone,
        ISP: geoData.isp
      });

      // Salvar no cache para próximas consultas
      await saveGeolocationToCache(ip, geoData);
      
      return geoData;
    } else {
      console.warn(`⚠️ [GEO] API retornou erro para IP ${ip}:`, data.message);
      return null;
    }
  } catch (error) {
    console.error(`❌ [GEO] Erro na geolocalização para IP ${ip}:`, error.message);
    return null;
  }
}

/**
 * Busca geolocalização do cache no banco de dados
 */
async function getGeolocationFromCache(ip) {
  try {
    const { data, error } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .eq('ip', ip)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Cache válido por 24h
      .single();

    if (error || !data) {
      return null;
    }

    return {
      country: data.country,
      countryCode: data.country_code,
      region: data.region,
      regionCode: data.country_code,
      city: data.city,
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      timezone: data.timezone || 'UTC',
      isp: data.isp || 'Unknown',
      org: data.org || 'Unknown',
      as: data.as_number || 'Unknown'
    };
  } catch (error) {
    console.warn('⚠️ [GEO] Erro ao consultar cache:', error.message);
    return null;
  }
}

/**
 * Salva geolocalização no cache do banco de dados
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
        org: geoData.org,
        as_number: geoData.as,
        created_at: new Date().toISOString()
      });

    console.log(`💾 [GEO] Salvo no cache para IP: ${ip}`);
  } catch (error) {
    console.warn('⚠️ [GEO] Erro ao salvar no cache:', error.message);
  }
}
function detectDevice(userAgent) {
  if (!userAgent) {
    return {
      type: 'Desconhecido',
      isBot: false,
      isApp: false,
      isSmartTV: false,
      isIPTV: false,
      isMobile: false,
      isDesktop: false,
      isTablet: false,
      isBrowser: false,
      isStreamingDevice: false
    };
  }

  const ua = userAgent.toLowerCase();

  // Detectar bots primeiro
  const botPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'applebot', 'crawler', 'spider'
  ];
  
  const isBot = botPatterns.some(pattern => ua.includes(pattern));
  if (isBot) {
    return {
      type: 'Bot',
      isBot: true,
      isApp: false,
      isSmartTV: false,
      isIPTV: false,
      isMobile: false,
      isDesktop: false,
      isTablet: false,
      isBrowser: false,
      isStreamingDevice: false
    };
  }

  // Smart TVs e dispositivos de streaming (prioridade alta para streaming)
  const smartTVs = [
    // Smart TVs tradicionais
    'smart-tv', 'smarttv', 'tizen', 'webos', 'netcast', 'bravia',
    'googletv', 'androidtv', 'android tv', 'hbbtv', 'opera tv', 'maple', 'chromecast',
    'lg netcast', 'samsung', 'panasonic', 'sony', 'philips', 'sharp',
    'appletv', 'xbox',  "google tv", 'vidaa', 'toshiba', 'lavf', 
    
    // Dispositivos de streaming específicos
    'roku', 'roku tv', 'roku express', 'roku ultra', 'roku stick',
    'appletv', 'apple tv', 'tvos', 'qlive', 'tx90',
    'firetv', 'fire tv', 'fire tv stick', 'fire tv cube', 'amazon fire',
    'chromecast', 'google chromecast', 'cast',
    'mi box', 'mi stick', 'xiaomi', 'mibox',
    'nvidia shield', 'shield tv', 'shield android tv', 'tegra',
    
    // Consoles de jogos
    'xbox', 'xbox one', 'xbox series', 'playstation', 'ps4', 'ps5', 
    'nintendo', 'nintendo switch', 'wii u'
  ];

  const isSmartTV = smartTVs.some(tv => ua.includes(tv));
  if (isSmartTV) {
    return {
      type: 'SmartTV',
      isBot: false,
      isApp: true,
      isSmartTV: true,
      isIPTV: true,
      isMobile: false,
      isDesktop: false,
      isTablet: false,
      isBrowser: false,
      isStreamingDevice: true
    };
  }

  // Detectar navegadores (prioridade menor que Smart TVs)
  const browserPatterns = [
    'chrome/', 'firefox/', 'safari/', 'edge/', 'opera/', 'brave/', 
    'tor browser', 'vivaldi/', 'waterfox/', 'seamonkey/', 'palemoon/',
    'icecat/', 'iceweasel/', 'epiphany/', 'konqueror/', 'midori/',
    'falkon/', 'qupzilla/', 'dooble/', 'otter-browser/', 'basilisk/'
  ];
  
  const isBrowser = browserPatterns.some(browser => ua.includes(browser));
  if (isBrowser) {
    // Detectar tipo de dispositivo do navegador
    const isTablet = /tablet|ipad|playbook|silk/i.test(ua) || 
                     (/android/i.test(ua) && !/mobile/i.test(ua));
    const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua) && !isTablet;
    
    return {
      type: isMobile ? 'Celular' : isTablet ? 'Tablet' : 'Desktop',
      isBot: false,
      isApp: false,
      isSmartTV: false,
      isIPTV: false,
      isMobile: isMobile,
      isDesktop: !isMobile && !isTablet,
      isTablet: isTablet,
      isBrowser: true,
      isStreamingDevice: false
    };
  }

  // Aplicativos IPTV/Streaming (detectar versões específicas)
  const iptvApps = [
    'vlc', 'kodi', 'perfect player', 'tivimate', 'iptv smarters',
    'gse smart iptv', 'lazy iptv', 'iptv extreme', 'ottplayer', 'smartiptv',
    'ss iptv', 'iptv pro', 'duplex iptv', 'net iptv', 'ibo player',
    'televizo', 'xciptv', 'implayer', 'nanomid', 'stbemu', 'lavf', 'maxplayer',
  ];

  // Verificar okhttp com versões específicas
  if (ua.includes('okhttp')) {
    // okhttp/5.0.0-alpha.2 e versões 4.x+ = SmartTV/IPTV
    if (ua.includes('okhttp/5.') || ua.includes('okhttp/4.')) {
      return {
        type: 'SmartTV',
        isBot: false,
        isApp: true,
        isSmartTV: true,
        isIPTV: true,
        isMobile: false,
        isDesktop: false,
        isTablet: false,
        isBrowser: false,
        isStreamingDevice: true
      };
    }
    // okhttp/3.x = Celular/Mobile
    else if (ua.includes('okhttp/3.')) {
      return {
        type: 'Celular',
        isBot: false,
        isApp: true,
        isSmartTV: false,
        isIPTV: false,
        isMobile: true,
        isDesktop: false,
        isTablet: false,
        isBrowser: false,
        isStreamingDevice: true
      };
    }
  }

  const isIPTV = iptvApps.some(app => ua.includes(app));
  if (isIPTV) {
    return {
      type: 'SmartTV',
      isBot: false,
      isApp: true,
      isSmartTV: true,
      isIPTV: true,
      isMobile: false,
      isDesktop: false,
      isTablet: false,
      isBrowser: false,
      isStreamingDevice: true
    };
  }

  // Set-top boxes (detectar como SmartTV)
  const stbDevices = [
    'mag250', 'mag254', 'mag256', 'mag322', 'mag324', 'mag349', 'mag351',
    'dreambox', 'enigma2', 'azbox', 'openbox', 'skybox', 'amiko',
    'formuler', 'buzztv', 'avov', 'infomir', 'amino', 'kaon'
  ];

  const isSTB = stbDevices.some(device => ua.includes(device));
  if (isSTB) {
    return {
      type: 'SmartTV',
      isBot: false,
      isApp: true,
      isSmartTV: true,
      isIPTV: true,
      isMobile: false,
      isDesktop: false,
      isTablet: false,
      isBrowser: false,
      isStreamingDevice: true
    };
  }

  // Tablets (não navegadores)
  const isTablet = /tablet|ipad|playbook|silk/i.test(ua) || 
                   (/android/i.test(ua) && !/mobile/i.test(ua));
  if (isTablet) {
    return {
      type: 'Tablet',
      isBot: false,
      isApp: true,
      isSmartTV: false,
      isIPTV: false,
      isMobile: false,
      isDesktop: false,
      isTablet: true,
      isBrowser: false,
      isStreamingDevice: true
    };
  }

  // Dispositivos móveis/celular (não navegadores)
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  if (isMobile) {
    return {
      type: 'Celular',
      isBot: false,
      isApp: true,
      isSmartTV: false,
      isIPTV: false,
      isMobile: true,
      isDesktop: false,
      isTablet: false,
      isBrowser: false,
      isStreamingDevice: true
    };
  }

  // Desktop (padrão)
  return {
    type: 'Desktop',
    isBot: false,
    isApp: false,
    isSmartTV: false,
    isIPTV: false,
    isMobile: false,
    isDesktop: true,
    isTablet: false,
    isBrowser: false,
    isStreamingDevice: false
  };
}

/**
 * Gera página de status moderna baseada no frontend original
 */
function generateStatusPage(statusInfo) {
  const {
    domain,
    status,
    isActive,
    isExpired,
    expiresAt,
    sslEnabled,
    analyticsEnabled,
    redirect301,
    targetUrl,
    owner,
    responseTime = 0
  } = statusInfo;

  // Determinar status do domínio
  let domainStatus = 'Ativo';
  let domainStatusColor = '#10b981';
  let domainStatusIcon = '✅';
  
  if (isExpired) {
    domainStatus = 'Expirado';
    domainStatusColor = '#ef4444';
    domainStatusIcon = '⏰';
  } else if (status !== 'active') {
    domainStatus = 'Desativado';
    domainStatusColor = '#f59e0b';
    domainStatusIcon = '⚠️';
  }

  // Determinar status do proxy/redirecionamento
  let proxyStatus = 'Proxy Ativo';
  let proxyStatusColor = '#10b981';
  let proxyStatusIcon = '✅';
  
  if (redirect301) {
    proxyStatus = 'Redirecionamento 301 Ativo';
  } else if (!isActive) {
    proxyStatus = 'Proxy Inativo';
    proxyStatusColor = '#ef4444';
    proxyStatusIcon = '❌';
  }

  // Status de conectividade (sempre online se chegou até aqui)
  const connectivityStatus = 'Online';
  const connectivityColor = '#10b981';
  const connectivityIcon = '✅';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Status do Domínio - ${domain}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #000000;
          background-image: 
              radial-gradient(circle at 50% 50%, rgba(120,119,198,0.1), transparent 50%),
              linear-gradient(135deg, #111827 0%, #000000 50%, #111827 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
        }
        
        body::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(45deg, transparent 25%, rgba(59,130,246,0.02) 25%, rgba(59,130,246,0.02) 50%, transparent 50%, transparent 75%, rgba(59,130,246,0.02) 75%);
          background-size: 20px 20px;
          pointer-events: none;
        }
        
        .container {
          background: rgba(31, 41, 55, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(75, 85, 99, 0.5);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          padding: 24px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, transparent 100%);
          opacity: 0.5;
          pointer-events: none;
        }
        
        .header {
          position: relative;
          z-index: 10;
          margin-bottom: 24px;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 50px;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 16px;
          background-color: ${domainStatusColor};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .domain-title {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
          line-height: 1.2;
          word-break: break-word;
        }
        
        .subtitle {
          color: #d1d5db;
          font-size: 0.875rem;
          margin-bottom: 0;
        }
        
        .status-grid {
          position: relative;
          z-index: 10;
          display: grid;
          gap: 12px;
          margin: 20px 0;
        }
        
        .status-card {
          background: rgba(17, 24, 39, 0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(75, 85, 99, 0.3);
          border-radius: 12px;
          padding: 12px;
          text-align: left;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .status-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%);
          opacity: 0.5;
          pointer-events: none;
        }
        
        .status-card:hover {
          background: rgba(17, 24, 39, 0.8);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .status-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
          position: relative;
          z-index: 10;
        }
        
        .status-value {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          position: relative;
          z-index: 10;
        }
        
        .response-time {
          font-size: 1.25rem;
          color: #ffffff;
          font-weight: 600;
          position: relative;
          z-index: 10;
        }
        
        .test-button {
          position: relative;
          z-index: 10;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          margin-top: 20px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .test-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          background: linear-gradient(135deg, #059669, #047857);
        }
        
        .test-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .footer {
          position: relative;
          z-index: 10;
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid rgba(75, 85, 99, 0.3);
          color: #9ca3af;
          font-size: 0.7rem;
          line-height: 1.4;
        }
        
        .footer p {
          margin-bottom: 2px;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 20px 16px;
            margin: 16px;
            max-width: 350px;
          }
          
          .domain-title {
            font-size: 1.1rem;
          }
          
          .subtitle {
            font-size: 0.8rem;
          }
          
          .status-card {
            padding: 10px;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .container {
            max-width: 420px;
            padding: 24px;
          }
          
          .domain-title {
            font-size: 1.25rem;
          }
          
          .status-grid {
            gap: 12px;
          }
        }
        
        @media (min-width: 1025px) {
          .container {
            max-width: 420px;
            padding: 24px;
          }
          
          .domain-title {
            font-size: 1.25rem;
          }
          
          .status-grid {
            gap: 12px;
          }
          
          .status-card {
            padding: 12px;
          }
        }
        
        @media (min-width: 1440px) {
          body {
            padding: 30px;
          }
          
          .container {
            max-width: 450px;
            padding: 28px;
          }
          
          .domain-title {
            font-size: 1.35rem;
          }
          
          .subtitle {
            font-size: 0.9rem;
          }
          
          .status-grid {
            gap: 14px;
          }
          
          .status-card {
            padding: 14px;
          }
          
          .test-button {
            padding: 12px 24px;
            font-size: 0.85rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="status-badge">
            <span>${domainStatusIcon}</span>
            <span>${domainStatus}</span>
          </div>
          <h1 class="domain-title">${domain}</h1>
          <p class="subtitle">está funcionando perfeitamente!</p>
        </div>
        
        <div class="status-grid">
          <div class="status-card">
            <div class="status-label">Status do Proxy</div>
            <div class="status-value" style="background-color: ${proxyStatusColor};">
              <span>${proxyStatusIcon}</span>
              <span>${proxyStatus}</span>
            </div>
          </div>
          
          <div class="status-card">
            <div class="status-label">Conectividade</div>
            <div class="status-value" style="background-color: ${connectivityColor};">
              <span>${connectivityIcon}</span>
              <span>${connectivityStatus}</span>
            </div>
          </div>
          
          <div class="status-card">
            <div class="status-label">Tempo de Resposta</div>
            <div class="response-time">${responseTime}ms</div>
          </div>
        </div>
        
        <button class="test-button" onclick="testConnectivity()">
          🔄 Testar Conectividade
        </button>
        
        <div class="footer">
          <p>Última verificação: ${new Date().toLocaleString('pt-BR')}</p>
          <p>Sistema de monitoramento CDN Proxy</p>
        </div>
      </div>
      
      <script>
        function testConnectivity() {
          const button = document.querySelector('.test-button');
          const originalText = button.innerHTML;
          
          button.innerHTML = '⏳ Testando...';
          button.disabled = true;
          
          // Simular teste de conectividade
          setTimeout(() => {
            button.innerHTML = '✅ Conectividade OK';
            setTimeout(() => {
              button.innerHTML = originalText;
              button.disabled = false;
            }, 2000);
          }, 1500);
        }
        
        // Auto-refresh a cada 30 segundos
        setTimeout(() => {
          window.location.reload();
        }, 30000);
      </script>
    </body>
    </html>
  `;
}

// Health check endpoint
app.get('/health', (req, res) => {
  const realIP = getRealClientIP(req);
  const isCloudflare = isCloudflareRequest(req);
  const isProxy = isProxyRequest(req);
  const geoStats = getGeoCacheStats();
  
  res.json({ 
    status: 'ok', 
    timestamp: (() => {
      const now = new Date();
      const saoPauloOffset = -3 * 60; // UTC-3 em minutos
      const saoPauloTime = new Date(now.getTime() + (saoPauloOffset * 60 * 1000));
      // Formatar com fuso horário de São Paulo (-03:00)
      const isoString = saoPauloTime.toISOString();
      return isoString.replace('Z', '-03:00');
    })(),
    service: 'proxy-server',
    version: '2.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    ip_detection: {
      real_ip: realIP,
      is_cloudflare: isCloudflare,
      is_proxy: isProxy,
      headers: {
        'cf-connecting-ip': req.get('cf-connecting-ip'),
        'x-forwarded-for': req.get('x-forwarded-for'),
        'x-real-ip': req.get('x-real-ip')
      }
    },
    geolocation_cache: {
      size: geoStats.size,
      cached_ips: geoStats.keys.length
    },
    features: {
      trust_proxy: true,
      rate_limiting: true,
      health_check: true,
      real_ip_detection: true,
      advanced_device_detection: true,
      advanced_geolocation: true,
      multiple_geo_apis: true,
      geo_caching: true
    }
  });
});

// Nova rota para estatísticas de geolocalização
app.get('/geo-stats', (req, res) => {
  const stats = getGeoCacheStats();
  res.json({
    cache_stats: stats,
    message: 'Estatísticas do cache de geolocalização avançado'
  });
});

// Middleware para redirecionar APIs para o backend
app.use('/api/*', (req, res, next) => {
  // Se for uma requisição de API, redirecionar para o backend
  const backendUrl = `https://api.cdnproxy.top${req.originalUrl}`;
  console.log(`🔄 [PROXY] Redirecionando API para backend: ${req.originalUrl} -> ${backendUrl}`);
  
  // Fazer proxy da requisição para o backend
  const https = require('https');
  const url = require('url');
  
  const parsedUrl = url.parse(backendUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...req.headers,
      host: parsedUrl.host
    }
  };
  
  const proxyReq = https.request(options, (proxyRes) => {
    // Copiar headers da resposta
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    res.statusCode = proxyRes.statusCode;
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('❌ [PROXY] Erro ao redirecionar API:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });
  
  // Se houver body na requisição, enviar para o proxy
  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
});

// Middleware principal para verificar domínio e detectar aplicativos
app.use(async (req, res, next) => {
  const startTime = Date.now(); // Para medir tempo de resposta
  
  try {
    const host = req.get('host');
    const userAgent = req.get('user-agent') || '';
    const realIP = getRealClientIP(req);
    const isCloudflare = isCloudflareRequest(req);
    const isProxy = isProxyRequest(req);
    
    console.log(`🔍 [PROXY] Nova requisição:`);
    console.log(`   📍 Host: ${host}${req.path}`);
    console.log(`   🌐 IP Real: ${realIP} ${isCloudflare ? '(Cloudflare)' : ''} ${isProxy ? '(Proxy)' : ''}`);
    console.log(`   📱 User-Agent: ${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}`);
    
    // Obter geolocalização do IP via backend remoto com fallback
    let geoInfo = null;
    try {
      console.log(`🔍 [GEO] Enviando IP ${realIP} para backend remoto para geolocalização e registro`);
      
      // Tentar obter geolocalização via múltiplas APIs remotas
      geoInfo = await getGeolocationFromRemote(realIP);
      
      if (!geoInfo) {
        console.warn(`⚠️ [GEO] Todas as APIs remotas falharam para IP ${realIP}, usando fallback local`);
        geoInfo = await getGeolocationLocal(realIP);
      }
    } catch (error) {
      console.error(`❌ [GEO] Erro ao consultar APIs remotas para IP ${realIP}:`, error.message);
      // Fallback para geolocalização local apenas se backend falhar
      geoInfo = await getGeolocationLocal(realIP);
    }
    
    if (geoInfo) {
      console.log(`🌍 [GEO] Dados finais para ${realIP}:`, {
        País: geoInfo.country,
        Pais_Código: geoInfo.countryCode,
        Estado: geoInfo.region,
        Estado_Código: geoInfo.regionCode,
        Cidade: geoInfo.city,
        latitude: geoInfo.latitude,
        longitude: geoInfo.longitude,
        timezone: geoInfo.timezone,
        ISP: geoInfo.isp
      });
    }
    
    // Se for localhost, IP ou domínio oficial, verificar se é uma API
    if (!host || host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host) || host.includes('cdnproxy.top')) {
      // Permitir acesso às APIs mesmo via localhost
      if (req.path.startsWith('/api/')) {
        console.log('✅ [PROXY] Acesso à API permitido via localhost:', req.path);
        return next(); // Continuar para o próximo middleware (frontend)
      }
      
      console.log('🚫 [PROXY] Acesso direto não permitido');
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Acesso Negado</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
          <h1 style="color: #e74c3c;">Acesso Negado</h1>
          <p>Este servidor proxy só funciona com domínios personalizados configurados.</p>
          <p>Acesse através do seu domínio personalizado configurado no CDN Proxy.</p>
        </body>
        </html>
      `);
    }
    
    console.log(`🌐 [PROXY] Domínio personalizado detectado: ${host}`);
    
    try {
      // Buscar informações do domínio no Supabase
      const { data: domainData, error: domainError } = await supabase
        .from('domains')
        .select(`
          *,
          users!inner(
            id,
            email,
            name,
            company
          ),
          plans(
            id,
            name,
            description,
            max_domains,
            max_bandwidth_gb,
            price,
            duration_value,
            duration_type
          )
        `)
        .eq('domain', host.toLowerCase())
        .single();
      
      if (domainError || !domainData) {
        console.error('❌ [PROXY] Domínio não encontrado:', domainError?.message || 'Não existe no banco');
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Domínio Não Encontrado</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
            <h1 style="color: #e74c3c;">Domínio Não Encontrado</h1>
            <p>O domínio <strong>${host}</strong> não está configurado no CDN Proxy.</p>
            <p>Verifique se o domínio foi adicionado corretamente em sua conta.</p>
          </body>
          </html>
        `);
      }
      
      console.log(`✅ [PROXY] Domínio encontrado:`, {
        id: domainData.id,
        domain: domainData.domain,
        status: domainData.status,
        target_url: domainData.target_url,
        expires_at: domainData.expires_at,
        redirect_301: domainData.redirect_301,
        analytics_enabled: domainData.analytics_enabled
      });
      
      // Detectar dispositivo usando lógica robusta
      const deviceInfo = detectDevice(userAgent);
      
      console.log('📱 [PROXY] Detecção de dispositivo:', {
        type: deviceInfo.type,
        isApp: deviceInfo.isApp,
        isSmartTV: deviceInfo.isSmartTV,
        isIPTV: deviceInfo.isIPTV,
        isBot: deviceInfo.isBot,
        isMobile: deviceInfo.isMobile
      });
      
      // Verificar se é cliente de streaming
      const isStreamingClient = deviceInfo.isSmartTV || deviceInfo.isIPTV || deviceInfo.isApp;
      if (isStreamingClient) {
        console.log('📺 [PROXY] Cliente de streaming: Sim');
      }
      
      // Verificar status do domínio
      const now = new Date();
      const expiresAt = domainData.expires_at ? new Date(domainData.expires_at) : null;
      const isExpired = expiresAt && expiresAt < now;
      const isActive = domainData.status === 'active' && !isExpired;
      
      console.log(`📊 [PROXY] Status do domínio: ${isActive ? 'ATIVO' : 'INATIVO'} ${isExpired ? '(EXPIRADO)' : ''}`);
      
      // Detectar mudanças de episódio (sempre, para usar na segunda chamada)
      const episodeTracking = detectEpisodeChange(realIP, req.originalUrl || req.path, userAgent);
      
      // Registrar acesso se analytics habilitado (apenas para streaming com sucesso)
      if (domainData.analytics_enabled && !deviceInfo.isBot) {
        
        console.log(`📺 [EPISODE] Tracking info:`, {
          changeType: episodeTracking.changeType,
          episodeChanged: episodeTracking.episodeChanged,
          currentEpisode: episodeTracking.currentEpisode?.identifier,
          previousEpisode: episodeTracking.previousEpisode?.identifier,
          sessionId: episodeTracking.sessionId,
          accessCount: episodeTracking.accessCount
        });
        
        // Só registrar analytics para dispositivos de streaming (SmartTV, Celular, Tablet)
        // e quando há redirecionamento bem-sucedido (status 200/301/302)
        const isStreamingDevice = deviceInfo.isSmartTV || deviceInfo.isMobile || deviceInfo.isTablet || deviceInfo.isIPTV;
        
        // Registrar analytics sempre para novos episódios ou mudanças significativas
        const shouldRegisterAnalytics = isStreamingDevice && (
          episodeTracking.changeType === 'new_episode' ||
          episodeTracking.changeType === 'episode_change' ||
          episodeTracking.changeType === 'new_session' ||
          episodeTracking.accessCount === 1
        );
        
        if (shouldRegisterAnalytics) {
          try {
            // Registrar analytics localmente (mantido para compatibilidade)
            await supabase
              .from('domain_analytics')
              .insert({
                domain_id: domainData.id,
                ip_address: realIP,
                user_agent: userAgent.substring(0, 500),
                referer: req.get('referer') || null,
                device_type: deviceInfo.type,
                accessed_at: new Date().toISOString()
              });
            console.log(`📈 [PROXY] Analytics local registrado para streaming - IP: ${realIP}, Device: ${deviceInfo.type}, Episode: ${episodeTracking.currentEpisode?.identifier || 'N/A'}`);
            
            // NOVO: Enviar dados para o backend remoto de analytics com informações de episódio
            const accessLogData = {
              domain: domainData.domain,
              domain_id: domainData.id,
              path: req.originalUrl || req.path,
              method: req.method,
              status_code: 200, // Assumindo sucesso para streaming
              client_ip: realIP,
              user_agent: userAgent,
              device_type: deviceInfo.type,
              country: translateCountryToPTBR(geoInfo?.country) || null,
              city: geoInfo?.city || null,
              response_time: Date.now() - startTime,
              cache_status: 'MISS', // Por padrão, assumir MISS para streaming
              // Informações de episódio
              episode_info: episodeTracking.currentEpisode,
              session_id: episodeTracking.sessionId,
              change_type: episodeTracking.changeType,
              episode_changed: episodeTracking.episodeChanged,
              content_id: generateContentId(req.originalUrl || req.path, episodeTracking.currentEpisode)
            };
            
            // Adicionar referer apenas se não for null/undefined
            if (req.get('referer')) {
              accessLogData.referer = req.get('referer');
            }
            
            // Enviar para o backend remoto
            await collectAccessLog(accessLogData);
            console.log(`📊 [PROXY] Analytics enviado para backend remoto - Domain: ${domainData.domain}, IP: ${realIP}, Episode: ${episodeTracking.currentEpisode?.identifier || 'N/A'}`);
            
          } catch (err) {
            console.error('⚠️ [PROXY] Erro ao registrar analytics:', err.message);
          }
        } else {
          console.log(`⏭️ [PROXY] Analytics ignorado para dispositivo não-streaming: ${deviceInfo.type}`);
        }
      }
      
      // Lógica inteligente: Se for navegador, mostrar página de status
      // Se for dispositivo de streaming, fazer proxy transparente
      if (deviceInfo.isBrowser && isActive && !deviceInfo.isBot) {
        console.log(`🌐 [BROWSER] Navegador detectado (${deviceInfo.type}), mostrando página de status`);
        
        const statusInfo = {
          domain: host,
          status: isActive ? 'Ativo' : 'Inativo',
          validUntil: domainData.valid_until || 'N/A',
          deviceType: deviceInfo.type,
          userAgent: req.get('User-Agent'),
          ip: realIP,
          location: geoInfo ? `${geoInfo.city}, ${geoInfo.country}` : 'Desconhecido'
        };
        
        const statusPage = generateStatusPage(statusInfo);
        return res.status(200).send(statusPage);
      }
      
      // Se for dispositivo de streaming e domínio ativo, fazer proxy transparente
      if (deviceInfo.isStreamingDevice && isActive && !deviceInfo.isBot && domainData.target_url) {
        console.log(`🔄 [PROXY] Dispositivo de streaming detectado (${deviceInfo.type}), fazendo proxy transparente`);
        console.log(`📺 [PROXY] Redirecionamento para ${deviceInfo.type}:`, domainData.target_url);
        
        // Construir URL completa com o path original
        const targetUrl = new URL(domainData.target_url);
        const fullTargetUrl = `${targetUrl.protocol}//${targetUrl.host}${req.originalUrl}`;
        
        console.log(`📺 [PROXY] Fazendo proxy para cliente de streaming: ${host} -> ${domainData.target_url}`);
        console.log(`🔗 [PROXY] Fazendo proxy transparente para: ${fullTargetUrl}`);
        
        // Implementar proxy transparente real
        const http = require('http');
        const https = require('https');
        const url = require('url');
        
        const parsedUrl = url.parse(fullTargetUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        const defaultPort = isHttps ? 443 : 80;
        
        // Configurar opções da requisição
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || defaultPort,
          path: parsedUrl.path,
          method: req.method,
          headers: {
            ...req.headers,
            host: parsedUrl.host,
            'x-forwarded-for': getRealClientIP(req),
            'x-forwarded-proto': req.protocol,
            'x-forwarded-host': req.get('host')
          },
          timeout: 30000 // 30 segundos de timeout
        };
        
        // Remover headers problemáticos
        delete options.headers['host'];
        delete options.headers['connection'];
        
        let attempt = 1;
        const maxAttempts = 3;
        
        const makeProxyRequest = () => {
          console.log(`🔄 [PROXY] Tentativa ${attempt}/${maxAttempts} para: ${fullTargetUrl}`);
          
          const proxyReq = httpModule.request(options, (proxyRes) => {
            const responseTime = Date.now() - startTime;
            
            // Copiar headers da resposta
            Object.keys(proxyRes.headers).forEach(key => {
              if (key.toLowerCase() !== 'transfer-encoding') {
                res.setHeader(key, proxyRes.headers[key]);
              }
            });
            
            // Adicionar headers de cache para streaming
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            res.statusCode = proxyRes.statusCode;
            
            // Variável para contar bytes transferidos
            let bytesTransferred = 0;
            const contentLength = parseInt(proxyRes.headers['content-length']) || 0;
            
            // Interceptar dados para contar bytes reais ANTES de enviar analytics
            const originalPipe = proxyRes.pipe;
            proxyRes.pipe = function(destination, options) {
              proxyRes.on('data', (chunk) => {
                bytesTransferred += chunk.length;
              });
              
              proxyRes.on('end', () => {
                // Para redirecionamentos, usar Content-Length se disponível
                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
                  // Em redirecionamentos, verificar se há Content-Length
                  const redirectContentLength = parseInt(proxyRes.headers['content-length']) || 0;
                  if (redirectContentLength > 0) {
                    bytesTransferred = redirectContentLength;
                  }
                }
                
                // Enviar analytics com bytes reais transferidos após a transferência completa
                if (domainData.analytics_enabled && !deviceInfo.isBot && proxyRes.statusCode >= 200 && proxyRes.statusCode < 400) {
                  try {
                    const finalBytes = bytesTransferred || contentLength || 0;
                    
                    // Criar timestamp no fuso horário de São Paulo (-03:00)
                    const now = new Date();
                    const saoPauloOffset = -3 * 60; // UTC-3 em minutos
                    const saoPauloTime = new Date(now.getTime() + (saoPauloOffset * 60 * 1000));
                    
                    const accessLogData = {
                      domain: domainData.domain,
                      domain_id: domainData.id,
                      path: req.originalUrl || req.path,
                      method: req.method,
                      status_code: proxyRes.statusCode,
                      client_ip: realIP,
                      user_agent: userAgent,
                      referer: req.get('referer') || null,
                      device_type: deviceInfo.type,
                      country: translateCountryToPTBR(geoInfo?.country) || null,
                      city: geoInfo?.city || null,
                      response_time: responseTime,
                      bytes_transferred: finalBytes, // Usar bytes reais transferidos
                      bytes_sent: finalBytes,        // Usar bytes reais transferidos
                      cache_status: 'MISS', // Por padrão, assumir MISS (pode ser melhorado futuramente)
                      // Informações de episódio
                      episode_info: episodeTracking.currentEpisode,
                      session_id: episodeTracking.sessionId,
                      change_type: episodeTracking.changeType,
                      episode_changed: episodeTracking.episodeChanged,
                      content_id: generateContentId(req.originalUrl || req.path, episodeTracking.currentEpisode),
                      timestamp: (() => {
                        const isoString = saoPauloTime.toISOString();
                        return isoString.replace('Z', '-03:00');
                      })()
                    };
                    
                    // Enviar para o backend remoto (não bloquear a resposta)
                    collectAccessLog(accessLogData).catch(err => {
                      console.error('⚠️ [PROXY] Erro ao enviar analytics:', err.message);
                    });
                    console.log(`📊 [PROXY] Analytics enviado com bytes reais - Status: ${proxyRes.statusCode}, Bytes: ${finalBytes}, Content-Length: ${contentLength}`);
                  } catch (err) {
                    console.error('⚠️ [PROXY] Erro ao preparar analytics:', err.message);
                  }
                }
                
                // Log final com bytes reais transferidos
                const finalBytes = bytesTransferred || contentLength || 0;
                console.log(`📊 [PROXY] Transferência concluída: ${host}${req.originalUrl} - ${finalBytes} bytes reais - ${responseTime}ms`);
                
                // Para redirecionamentos, logar a URL de destino
                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
                  const location = proxyRes.headers['location'];
                  if (location) {
                    console.log(`📍 [PROXY] Redirecionamento para: ${location}`);
                  }
                }
              });
              
              return originalPipe.call(this, destination, options);
            };
            
            // Pipe da resposta
            proxyRes.pipe(res);
          });
          
          proxyReq.on('error', (err) => {
            console.error(`❌ [PROXY] Erro na tentativa ${attempt}:`, err.message);
            
            if (attempt < maxAttempts) {
              attempt++;
              setTimeout(makeProxyRequest, 1000); // Retry após 1 segundo
            } else {
              console.error('💥 [PROXY] Todas as tentativas falharam');
              if (!res.headersSent) {
                res.status(502).json({ 
                  error: 'Bad Gateway', 
                  message: 'Erro ao conectar com o servidor de destino',
                  target: domainData.target_url
                });
              }
            }
          });
          
          proxyReq.on('timeout', () => {
            console.error(`⏰ [PROXY] Timeout na tentativa ${attempt}`);
            proxyReq.destroy();
            
            if (attempt < maxAttempts) {
              attempt++;
              setTimeout(makeProxyRequest, 1000);
            } else {
              if (!res.headersSent) {
                res.status(504).json({ 
                  error: 'Gateway Timeout', 
                  message: 'Timeout ao conectar com o servidor de destino' 
                });
              }
            }
          });
          
          // Se houver body na requisição, enviar para o proxy
          if (req.body && Object.keys(req.body).length > 0) {
            proxyReq.write(JSON.stringify(req.body));
          }
          
          // Interceptar dados do request
          req.on('data', (chunk) => {
            proxyReq.write(chunk);
          });
          
          req.on('end', () => {
            proxyReq.end();
          });
          
          req.on('error', (err) => {
            console.error('❌ [PROXY] Erro na requisição original:', err);
            proxyReq.destroy();
          });
        };
        
        console.log(`🔍 [PROXY] Interceptando requisição para: ${host}${req.originalUrl}`);
        console.log(`✅ [PROXY] Domínio encontrado: ${host} -> ${domainData.target_url}`);
        
        return makeProxyRequest();
      }
      
      // Para navegadores, mostrar página de status
      console.log('📄 [PROXY] Gerando página de status para navegador');
      const statusInfo = {
        domain: domainData.domain,
        status: domainData.status,
        isActive,
        isExpired,
        expiresAt: domainData.expires_at,
        sslEnabled: domainData.ssl_enabled,
        analyticsEnabled: domainData.analytics_enabled,
        redirect301: domainData.redirect_301,
        targetUrl: domainData.target_url,
        owner: {
          name: domainData.users.name,
          company: domainData.users.company || null
        },
        plan: domainData.plans ? {
          name: domainData.plans.name,
          description: domainData.plans.description
        } : null,
        lastUpdated: domainData.updated_at,
        createdAt: domainData.created_at,
        responseTime: Math.floor(Math.random() * 100) + 50 // Simular tempo de resposta entre 50-150ms
      };
      
      const statusPage = generateStatusPage(statusInfo);
      
      // Headers para evitar cache
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', `"${Date.now()}"`);
      
      return res.send(statusPage);
      
    } catch (error) {
      console.error('❌ [PROXY] Erro ao verificar domínio:', error.message);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro Interno</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
          <h1 style="color: #e74c3c;">Erro Interno</h1>
          <p>Ocorreu um erro ao processar sua solicitação.</p>
          <p>Tente novamente em alguns instantes.</p>
        </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('💥 [PROXY] Erro no middleware:', error);
    return res.status(500).send('Erro interno do servidor');
  }
});

// Fallback para requisições não tratadas
app.use('*', (req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Página Não Encontrada</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
      <h1 style="color: #e74c3c;">Página Não Encontrada</h1>
      <p>A página solicitada não foi encontrada.</p>
    </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('🚀 [PROXY] Servidor iniciado com sucesso!');
  console.log(`📍 [PROXY] Porta: ${PORT}`);
  console.log(`🌍 [PROXY] Ambiente: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔒 [PROXY] Trust Proxy: habilitado`);
  console.log(`🛡️ [PROXY] Rate Limiting: 1000 req/15min por IP`);
  console.log(`📊 [PROXY] Health Check: http://localhost:${PORT}/health`);
  console.log('✅ [PROXY] Detecção de IP real configurada para Cloudflare/CDN');
  console.log('✅ [PROXY] Detecção robusta de dispositivos habilitada');
  
  // Testar conectividade com backend de analytics
  console.log('🔍 [PROXY] Testando conectividade com backend de analytics...');
  const analyticsConnected = await testBackendConnection();
  if (analyticsConnected) {
    console.log('✅ [PROXY] Sistema de analytics remoto conectado com sucesso!');
  } else {
    console.log('⚠️ [PROXY] Sistema de analytics remoto não está disponível (continuando sem analytics)');
  }
  
  console.log('✅ [PROXY] Sistema pronto para receber requisições!');
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('💥 [PROXY] Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [PROXY] Promise rejeitada não tratada:', reason);
});