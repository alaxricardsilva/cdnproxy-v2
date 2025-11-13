import express from 'express';
import { UAParser } from 'ua-parser-js';

const app = express();

// Configuração do servidor
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

const PORT = process.env.PORT || 8080;

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

/**
 * Função para detectar mudanças de episódio
 */
function detectEpisodeChange(realIP, reqUrl, userAgent) {
  // TODO: Implementar lógica de detecção de episódio
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
      .insert({
        domain: accessLogData.domain,
        domain_id: accessLogData.domain_id,
        path: accessLogData.path,
        method: accessLogData.method,
        status_code: accessLogData.status_code,
        client_ip: accessLogData.client_ip,
        user_agent: accessLogData.user_agent,
        referer: accessLogData.referer,
        device_type: accessLogData.device_type,
        country: accessLogData.country,
        city: accessLogData.city,
        isp: accessLogData.isp,
        response_time: accessLogData.response_time,
        bytes_transferred: accessLogData.bytes_transferred,
        bytes_sent: accessLogData.bytes_sent,
        cache_status: accessLogData.cache_status,
        // Informações de episódio
        episode_info: accessLogData.episode_info,
        session_id: accessLogData.session_id,
        change_type: accessLogData.change_type,
        episode_changed: accessLogData.episode_changed,
        content_id: accessLogData.content_id
      });

    console.log(`📈 [PROXY] Analytics local registrado para streaming - IP: ${realIP}, Device: ${deviceInfo.type} (${deviceInfo.appName}), Episode: ${episodeTracking.currentEpisode?.identifier || 'N/A'}`);
    
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
      app_name: deviceInfo.appName,
      country: translateCountryToPTBR(geoInfo?.country) || null,
      city: geoInfo?.city || null,
      isp: geoInfo?.isp || null,
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
    console.log(`📊 [PROXY] Analytics enviado para backend remoto - Domain: ${domainData.domain}, IP: ${realIP}, Device: ${deviceInfo.type} (${deviceInfo.appName}), Episode: ${episodeTracking.currentEpisode?.identifier || 'N/A'}`);
    
  } catch (err) {
    console.error('⚠️ [PROXY] Erro ao registrar analytics:', err.message);
  }
}

/**
 * Função para obter geolocalização original (agora deprecada - mantida para compatibilidade)
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
async function getGeolocalizationFromCache(ip) {
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
      appName: 'Desconhecido',
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

  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const ua = userAgent.toLowerCase();

  // Detectar bots (biblioteca + custom)
  const botPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'applebot', 'crawler', 'spider'
  ];
  const isBot = (result.device.type === 'bot') || botPatterns.some(pattern => ua.includes(pattern));

  if (isBot) {
    return {
      type: 'Bot',
      appName: 'Bot',
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

  // Detectar tipo de dispositivo usando biblioteca com verificações customizadas
  let deviceType = (result.device.type || 'desktop').toLowerCase();
  if (deviceType === 'mobile') deviceType = 'celular';
  if (deviceType === 'smarttv') deviceType = 'smarttv';
  if (deviceType === 'tablet') deviceType = 'tablet';
  deviceType = deviceType.charAt(0).toUpperCase() + deviceType.slice(1);

  // Verificação customizada para mobile se detectado como desktop
  const mobilePatterns = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i;
  if (deviceType === 'Desktop' && mobilePatterns.test(ua)) {
    deviceType = 'Celular';
  }

  let isMobileDevice = deviceType === 'Celular';
  let isTabletDevice = deviceType === 'Tablet';
  let isSmartTVDevice = deviceType === 'Smarttv';
  let isDesktopDevice = deviceType === 'Desktop';

  // Custom patterns para SmartTV se não detectado
  const smartTVPatterns = [
    'tizen', 'webos', 'bravia', 'panasonic', 'philips',
    'androidtv', 'android tv', 'googletv', 'google tv',
    'roku', 'appletv', 'apple tv', 'tvos', 'firetv', 'fire tv',
    'chromecast', 'mi box', 'mibox', 'nvidia shield', 'shield tv',
    'xbox', 'playstation', 'ps4', 'ps5', 'nintendo',
    'mag250', 'mag254', 'mag256', 'mag322', 'mag324', 'mag349', 'mag351',
    'dreambox', 'enigma2', 'formuler', 'buzztv', 'avov', 'infomir', 'amino', 'kaon'
  ];

  if (!isSmartTVDevice && smartTVPatterns.some(pattern => ua.includes(pattern))) {
    deviceType = 'SmartTV';
    isSmartTVDevice = true;
    isDesktopDevice = false;
  }

  // Detectar aplicativos IPTV
  const iptvAppsDetailed = [
    { patterns: ['vlc/', 'libvlc', 'videolan', 'vlc media player'], name: 'VLC Media Player' },
    { patterns: ['kodi/', 'xbmc', 'matrix', 'leia', 'nexus'], name: 'Kodi' },
    { patterns: ['perfect player', 'perfect'], name: 'Perfect Player' },
    { patterns: ['tivimate', 'tivi'], name: 'TiviMate' },
    { patterns: ['iptv smarters', 'smarters'], name: 'IPTV Smarters Pro' },
    { patterns: ['gse smart iptv', 'gse'], name: 'GSE Smart IPTV' },
    { patterns: ['lazy iptv'], name: 'Lazy IPTV' },
    { patterns: ['iptv extreme'], name: 'IPTV Extreme' },
    { patterns: ['ottplayer', 'ott player', 'ottnavigator'], name: 'OTT Player' },
    { patterns: ['smartiptv', 'smart iptv'], name: 'Smart IPTV' },
    { patterns: ['ss iptv'], name: 'SS IPTV' },
    { patterns: ['iptv pro'], name: 'IPTV Pro' },
    { patterns: ['duplex iptv'], name: 'Duplex IPTV' },
    { patterns: ['net iptv'], name: 'Net IPTV' },
    { patterns: ['ibo player'], name: 'IBO Player' },
    { patterns: ['televizo'], name: 'Televizo' },
    { patterns: ['xciptv'], name: 'XCIPTV' },
    { patterns: ['implayer'], name: 'ImPlayer' },
    { patterns: ['stbemu', 'stb emulator'], name: 'STB Emulator' },
    { patterns: ['mytvonline'], name: 'MyTVOnline' },
    { patterns: ['nanomid'], name: 'Nanomid' },
    { patterns: ['lavf'], name: 'LAVF Player' },
    { patterns: ['maxplayer'], name: 'MaxPlayer' }
  ];

  let detectedIPTVApp = null;
  let isIPTV = false;
  for (const app of iptvAppsDetailed) {
    if (app.patterns.some(pattern => ua.includes(pattern))) {
      detectedIPTVApp = app.name;
      isIPTV = true;
      break;
    }
  }

  // Detectar OkHttp para IPTV e ajustar tipo de dispositivo
  let isOkHttpIPTV = false;
  if (ua.includes('okhttp')) {
    if (ua.includes('okhttp/5.') || ua.includes('okhttp/4.')) {
      isOkHttpIPTV = true;
      deviceType = 'SmartTV';
      isSmartTVDevice = true;
      isDesktopDevice = false;
      isMobileDevice = false;
      isTabletDevice = false;
    } else if (ua.includes('okhttp/3.')) {
      const hasBrowserPattern = ua.includes('chrome') || ua.includes('safari') ||
                                ua.includes('firefox') || ua.includes('edge') ||
                                ua.includes('webkit') || ua.includes('mozilla');
      if (!hasBrowserPattern) {
        isOkHttpIPTV = true;
        deviceType = 'Celular';
        isMobileDevice = true;
        isDesktopDevice = false;
        isSmartTVDevice = false;
        isTabletDevice = false;
      }
    }
    if (isOkHttpIPTV) {
      isIPTV = true;
      if (!detectedIPTVApp) {
        detectedIPTVApp = ua.includes('android') ? 'Android IPTV App' : 'OkHttp IPTV App';
      }
    }
  }

  // Nome do app
  let appName = result.browser.name || result.engine.name || 'Desconhecido';
  if (detectedIPTVApp) {
    appName = detectedIPTVApp;
  } else if (isOkHttpIPTV) {
    appName = detectedIPTVApp;
  } else if (!result.browser.name && !isDesktopDevice) {
    appName = `${deviceType} App`;
  }

  // Flags
  const isApp = isIPTV || (result.browser.name ? false : !isDesktopDevice);
  const isBrowser = !!result.browser.name && isDesktopDevice && !isIPTV;
  const isStreamingDevice = isSmartTVDevice || isIPTV;

  return {
    type: deviceType,
    appName,
    isBot,
    isApp,
    isSmartTV: isSmartTVDevice,
    isIPTV,
    isMobile: isMobileDevice,
    isDesktop: isDesktopDevice,
    isTablet: isTabletDevice,
    isBrowser,
    isStreamingDevice
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
          
          // Teste real de conectividade com o backend
          button.disabled = true;
          button.innerHTML = '⏳ Testando conectividade...';

          fetch('https://api.cdnproxy.top/api/status') // Altere para o endpoint real do seu backend!
            .then(response => {
              if (response.ok) {
                button.innerHTML = '✅ Conectividade OK';
              } else {
                button.innerHTML = '❌ Falha na conexão';
              }
              setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
              }, 2000);
            })
            .catch(error => {
              button.innerHTML = '❌ Erro de conexão';
              setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
              }, 2000);
            });
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
// Rota /geo-stats removida pois getGeoCacheStats foi depreciada após migração para cache Supabase

// Rota explícita para página de status (sem autenticação)
app.get('/__status', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const host = req.get('host');
    const userAgent = req.get('user-agent') || '';
    const realIP = getRealClientIP(req);
    
    console.log(`📄 [STATUS] Requisição explícita de status para: ${host}`);
    
    // Obter geolocalização
    let geoInfo = null;
    try {
      geoInfo = await getGeolocationFromRemote(realIP);
      if (!geoInfo) {
        geoInfo = await getGeolocationLocal(realIP);
      }
    } catch (error) {
      console.error(`❌ [GEO] Erro ao consultar geolocalização:`, error.message);
      geoInfo = await getGeolocationLocal(realIP);
    }
    
    // Se for localhost ou IP, mostrar página de status genérica
    if (!host || host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
      const statusInfo = {
        domain: host || 'localhost',
        status: 'Desenvolvimento',
        isActive: true,
        isExpired: false,
        responseTime: Date.now() - startTime
      };
      
      const statusPage = generateStatusPage(statusInfo);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(statusPage);
    }
    
    // Buscar informações do domínio no Supabase
    const { data: domainData, error: domainError } = await supabase
      .from('domains')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          company,
          status
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
      console.error('❌ [STATUS] Domínio não encontrado:', domainError?.message || 'Não existe no banco');
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
    
    // Verificar status do domínio
    const now = new Date();
    const expiresAt = domainData.expires_at ? new Date(domainData.expires_at) : null;
    const isExpired = expiresAt && expiresAt < now;
    
    const statusInfo = {
      domain: domainData.domain,
      status: domainData.status,
      isActive: !isExpired,
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
      responseTime: Date.now() - startTime,
      deviceType: 'browser',
      userAgent,
      ip: realIP,
      location: geoInfo ? `${geoInfo.city}, ${geoInfo.country}` : 'Desconhecido'
    };
    
    const statusPage = generateStatusPage(statusInfo);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${Date.now()}"`);
    
    return res.send(statusPage);
    
  } catch (error) {
    console.error('❌ [STATUS] Erro ao gerar página de status:', error.message);
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
});

// Criar um roteador separado para lidar com as rotas de API

const apiRouter = express.Router();
import https from 'https';

// Middleware para redirecionar APIs para o backend
// Ajustar a definição da rota para usar parâmetros explícitos
apiRouter.use('/:path(.*)', (req, res) => {
  const backendUrl = `https://api.cdnproxy.top/${req.params.path}${req.url}`;
  console.log(`🔄 [PROXY] Redirecionando API para backend: ${req.originalUrl} -> ${backendUrl}`);

  const options = {
    hostname: new URL(backendUrl).hostname,
    port: 443,
    path: new URL(backendUrl).pathname + new URL(backendUrl).search,
    method: req.method,
    headers: {
      ...req.headers,
      host: new URL(backendUrl).hostname
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });

    res.statusCode = proxyRes.statusCode;
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('❌ [PROXY] Erro ao redirecionar API:', err);
    res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }

  proxyReq.end();
});

// Registrar o roteador no aplicativo principal
app.use('/api', apiRouter);

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
    
    // Se for localhost, IP ou domínios oficiais (não subdomínios personalizados), permitir acesso completo
    const isOfficialDomain = host === 'cdnproxy.top' || host === 'app.cdnproxy.top' || host === 'api.cdnproxy.top';
    if (!host || host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host) || isOfficialDomain) {
      console.log('✅ [PROXY] Acesso direto permitido para localhost/IP/domínio oficial:', host);
      return next(); // Continuar para o próximo middleware (frontend)
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
            company,
            status
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
      
      
      // Verificar status do usuário
      const userStatus = domainData.users.status;
      if (userStatus !== 'active') {
        console.log(`🚫 [PROXY] Usuário com status inativo: ${userStatus}`);
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Conta Inativa</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
            <h1 style="color: #e74c3c;">Conta Inativa</h1>
            <p>Sua conta está com status: <strong>${userStatus.toUpperCase()}</strong></p>
            <p>Entre em contato com o suporte para reativar sua conta.</p>
          </body>
          </html>
        `);
      }
      
      console.log(`✅ [PROXY] Usuário ativo: ${domainData.users.email} (status: ${userStatus})`);

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
        appName: deviceInfo.appName,
        isApp: deviceInfo.isApp,
        isSmartTV: deviceInfo.isSmartTV,
        isIPTV: deviceInfo.isIPTV,
        isBot: deviceInfo.isBot,
        isMobile: deviceInfo.isMobile,
        isBrowser: deviceInfo.isBrowser
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
                app_name: deviceInfo.appName,
                accessed_at: new Date().toISOString()
              });
            console.log(`📈 [PROXY] Analytics local registrado para streaming - IP: ${realIP}, Device: ${deviceInfo.type} (${deviceInfo.appName}), Episode: ${episodeTracking.currentEpisode?.identifier || 'N/A'}`);
            
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
              app_name: deviceInfo.appName,
              country: translateCountryToPTBR(geoInfo?.country) || null,
              city: geoInfo?.city || null,
              isp: geoInfo?.isp || null,
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
            console.log(`📊 [PROXY] Analytics enviado para backend remoto - Domain: ${domainData.domain}, IP: ${realIP}, Device: ${deviceInfo.type} (${deviceInfo.appName}), Episode: ${episodeTracking.currentEpisode?.identifier || 'N/A'}`);
            
          } catch (err) {
            console.error('⚠️ [PROXY] Erro ao registrar analytics:', err.message);
          }
        } else {
          console.log(`⏭️ [PROXY] Analytics ignorado para dispositivo não-streaming: ${deviceInfo.type}`);
        }
      }
      
      // Verificar se é solicitação explícita de status
      const isStatusRequest = req.query.status === '1' || req.path === '/__status';
      
      // Lógica inteligente de roteamento:
      // 1. Se for dispositivo de streaming e domínio ativo, fazer proxy transparente
      // 2. Se for navegador ou solicitação explícita de status, mostrar página de status
      // 3. Se domínio inativo, sempre mostrar página de status
      
      if (deviceInfo.isStreamingDevice && isActive && !deviceInfo.isBot && domainData.target_url && !isStatusRequest) {
        console.log(`🔄 [PROXY] Dispositivo de streaming detectado (${deviceInfo.type}), fazendo proxy transparente`);
        console.log(`📺 [PROXY] Redirecionamento para ${deviceInfo.type}:`, domainData.target_url);
        
        // Remover duplicações de configuração do servidor no arquivo.
        // Configuração do servidor já está definida anteriormente, eliminando duplicações
        
        // Construir URL completa
        const targetUrl = new URL(domainData.target_url);
        const fullUrl = `${targetUrl.protocol}//${targetUrl.host}${req.originalUrl}`;
        
        console.log(`🎯 [PROXY] URL completa: ${fullUrl}`);
        
        // Configurar opções da requisição
        const urlObj = new URL(fullUrl);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: req.method,
          headers: { ...req.headers }
        };
        
        // Remover headers problemáticos
        delete options.headers.host;
        delete options.headers['x-forwarded-for'];
        delete options.headers['x-real-ip'];
        delete options.headers['cf-connecting-ip'];
        
        // Adicionar headers necessários
        options.headers.host = urlObj.hostname;
        options.headers['x-forwarded-for'] = realIP;
        options.headers['x-real-ip'] = realIP;
        
        const httpModule = urlObj.protocol === 'https:' ? require('https') : require('http');
        
        let attempt = 1;
        const maxAttempts = 3;
        
        const makeProxyRequest = () => {
          const startTime = Date.now();
          
          const proxyReq = httpModule.request(options, (proxyRes) => {
            const responseTime = Date.now() - startTime;
            console.log(`📊 [PROXY] Resposta recebida: ${proxyRes.statusCode} - ${responseTime}ms`);
            
            // Copiar headers da resposta
            Object.keys(proxyRes.headers).forEach(key => {
              if (key.toLowerCase() !== 'transfer-encoding') {
                res.setHeader(key, proxyRes.headers[key]);
              }
            });
            
            // Adicionar headers de cache e CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('X-Proxy-Cache', 'MISS');
            res.setHeader('X-Proxy-Server', 'CDNProxy/1.0');
            res.setHeader('X-Response-Time', `${responseTime}ms`);
            
            // Definir status da resposta
            res.status(proxyRes.statusCode);
            
            // Rastrear bytes transferidos
            let bytesTransferred = 0;
            const contentLength = parseInt(proxyRes.headers['content-length']) || 0;
            
            // Interceptar o pipe para contar bytes
            const originalPipe = proxyRes.pipe;
            proxyRes.pipe = function(destination, options) {
              this.on('data', (chunk) => {
                bytesTransferred += chunk.length;
              });
              
              this.on('end', () => {
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
                      device_type: deviceInfo.type,
                      country: translateCountryToPTBR(geoInfo?.country) || null,
                      city: geoInfo?.city || null,
                      isp: geoInfo?.isp || null,
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
                      timestamp: `${saoPauloTime.getDate().toString().padStart(2, '0')}-${(saoPauloTime.getMonth() + 1).toString().padStart(2, '0')}-${saoPauloTime.getFullYear()} ${saoPauloTime.getHours().toString().padStart(2, '0')}:${saoPauloTime.getMinutes().toString().padStart(2, '0')}:${saoPauloTime.getSeconds().toString().padStart(2, '0')}`
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
      
      // Para navegadores ou solicitações explícitas de status, mostrar página de status
      console.log(`📄 [PROXY] Gerando página de status - Navegador: ${deviceInfo.isBrowser}, Status Request: ${isStatusRequest}, Ativo: ${isActive}`);
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
        responseTime: Math.floor(Math.random() * 100) + 50, // Simular tempo de resposta entre 50-150ms
        deviceType: deviceInfo.type,
        userAgent: req.get('User-Agent'),
        ip: realIP,
        location: geoInfo ? `${geoInfo.city}, ${geoInfo.country}` : 'Desconhecido'
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
  console.log(`❓ [PROXY] Requisição não tratada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Not Found', 
    message: 'Rota não encontrada',
    path: req.originalUrl 
  });
});

// Inicializar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 [PROXY] Servidor iniciado na porta ${PORT}`);
  console.log(`🔧 [PROXY] Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 [PROXY] Analytics habilitado: ${process.env.ANALYTICS_ENABLED !== 'false'}`);
  console.log(`🌐 [PROXY] CORS configurado para:`, corsOptions.origin);
  
  // Testar conectividade com backend de analytics
  testBackendConnection().then(result => {
    if (result.success) {
      console.log(`✅ [PROXY] Conectividade com backend de analytics: OK (${result.responseTime}ms)`);
    } else {
      console.log(`⚠️ [PROXY] Conectividade com backend de analytics: FALHA - ${result.error}`);
    }
  });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('💥 [PROXY] Erro não capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [PROXY] Promise rejeitada não tratada:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [PROXY] Recebido SIGTERM, encerrando servidor...');
  server.close(() => {
    console.log('✅ [PROXY] Servidor encerrado graciosamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 [PROXY] Recebido SIGINT, encerrando servidor...');
  server.close(() => {
    console.log('✅ [PROXY] Servidor encerrado graciosamente');
    process.exit(0);
  });
});

// Middleware global para tratamento de erros consistente em todas as rotas e middlewares.
app.use((err, req, res, next) => {
  console.error('💥 [ERROR] Erro capturado no middleware global:', err);

  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    message: err.message || 'Ocorreu um erro inesperado.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const fs = require('fs');
const path = require('path');

// Função para carregar rotas automaticamente
function loadRoutes(app, routesDir) {
  fs.readdirSync(routesDir).forEach((file) => {
    const filePath = path.join(routesDir, file);

    // Verificar se é um arquivo JavaScript ou TypeScript
    if (fs.statSync(filePath).isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
      const route = require(filePath);

      if (typeof route === 'function') {
        console.log(`🔄 [ROUTES] Carregando rota: ${file}`);
        route(app); // Registrar a rota no aplicativo principal
      }
    }
  });
}

// Diretório de rotas
const routesDirectory = path.join(__dirname, 'backend');
loadRoutes(app, routesDirectory);