import { UAParser } from 'ua-parser-js';

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

const PORT = process.env.PORT || 8080;

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
          background-color: ${proxyStatusColor};
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .status-value span {
          font-size: 1.25rem;
          font-weight: 700;
          margin-right: 8px;
        }
        
        .footer {
          position: relative;
          z-index: 10;
          margin-top: 24px;
          font-size: 0.75rem;
          color: #9ca3af;
        }
        
        .footer a {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 600;
        }
        
        .footer a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="status-badge">
            <span>${domainStatusIcon}</span>
            ${domainStatus}
          </div>
          <h1 class="domain-title">${domain}</h1>
          <p class="subtitle">Status do domínio</p>
        </div>
        <div class="status-grid">
          <div class="status-card">
            <p class="status-label">Status do Proxy</p>
            <div class="status-value">
              <span>${proxyStatusIcon}</span>
              ${proxyStatus}
            </div>
          </div>
          <div class="status-card">
            <p class="status-label">Conectividade</p>
            <div class="status-value">
              <span>${connectivityIcon}</span>
              ${connectivityStatus}
            </div>
          </div>
          <div class="status-card">
            <p class="status-label">Tempo de Resposta</p>
            <div class="status-value">
              <span>⏱️</span>
              ${responseTime}ms
            </div>
          </div>
          <div class="status-card">
            <p class="status-label">SSL</p>
            <div class="status-value">
              <span>${sslEnabled ? '🔒' : '❌'}</span>
              ${sslEnabled ? 'Ativo' : 'Inativo'}
            </div>
          </div>
          <div class="status-card">
            <p class="status-label">Analytics</p>
            <div class="status-value">
              <span>${analyticsEnabled ? '📊' : '❌'}</span>
              ${analyticsEnabled ? 'Ativo' : 'Inativo'}
            </div>
          </div>
          <div class="status-card">
            <p class="status-label">Redirecionamento</p>
            <div class="status-value">
              <span>${redirect301 ? '🔀' : '❌'}</span>
              ${redirect301 ? 'Ativo' : 'Inativo'}
            </div>
          </div>
          <div class="status-card">
            <p class="status-label">Expiração</p>
            <div class="status-value">
              <span>${isExpired ? '⏰' : '✅'}</span>
              ${isExpired ? `Expirado em ${expiresAt}` : `Ativo até ${expiresAt}`}
            </div>
          </div>
          <div class="status-card">
            <p class="status-label">Proprietário</p>
            <div class="status-value">
              <span>👤</span>
              ${owner || 'Desconhecido'}
            </div>
          </div>
        </div>
        <div class="footer">
          <p>Desenvolvido por <a href="https://cdnproxy.top" target="_blank">CDNProxy</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Endpoint de saúde do servidor
 */
app.get('/health', async (req, res) => {
  try {
    const healthStatus = await checkBackendHealth();
    res.status(200).json({ status: 'ok', backend: healthStatus });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Endpoint de status detalhado
 */
app.get('/__status', async (req, res) => {
  try {
    const domain = req.query.domain;
    if (!domain) {
      return res.status(400).send('Domain is required');
    }

    const statusInfo = await getDomainStatus(domain);
    const statusPage = generateStatusPage(statusInfo);

    res.status(200).send(statusPage);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint para /api/analytics
app.post('/api/analytics', async (req, res) => {
  try {
    const { event, data } = req.body;
    if (!event || !data) {
      return res.status(400).json({ error: 'Event and data are required' });
    }

    // Lógica para processar analytics
    await saveAnalytics(event, data);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process analytics', details: error.message });
  }
});

// Endpoint para /api/domains
app.get('/api/domains', async (req, res) => {
  try {
    const domains = await getAllDomains();
    res.status(200).json(domains);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domains', details: error.message });
  }
});

// Construção de URLs seguras no proxy transparente
if (deviceInfo.isStreamingDevice && isActive && !deviceInfo.isBot && domainData.target_url && !isStatusRequest) {
  console.log(`🔄 [PROXY] Dispositivo de streaming detectado (${deviceInfo.type}), fazendo proxy transparente`);
  console.log(`📺 [PROXY] Redirecionamento para ${deviceInfo.type}:`, domainData.target_url);

  try {
    // Corrigindo a lógica de construção de URLs para evitar duplicações
    const targetUrl = new URL(domainData.target_url);
    let fullUrl;
    
    if (req.originalUrl.startsWith('/')) {
      fullUrl = `${targetUrl.origin}${req.originalUrl}`;
    } else {
      fullUrl = `${targetUrl.origin}/${req.originalUrl}`;
    }
    
    console.log(`🎯 [PROXY] URL corrigida: ${fullUrl}`);
    
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

    // Fazer requisição ao backend
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
      console.error(`❌ [PROXY] Erro ao fazer proxy transparente: ${err.message}`);
      res.status(500).send('Erro interno ao processar proxy');
    });
  } catch (error) {
    console.error(`❌ [PROXY] Erro ao construir URL: ${error.message}`);
    res.status(400).send('URL inválida para proxy');
  }
}

// Função para identificar o IP real do cliente
function getRealClientIP(req) {
  const headers = req.headers;

  // Verificar cabeçalhos comuns para IP real
  const ipFromHeaders = headers['x-forwarded-for'] || headers['cf-connecting-ip'] || headers['x-real-ip'];

  if (ipFromHeaders) {
    // `X-Forwarded-For` pode conter múltiplos IPs, pegar o primeiro
    const ipList = ipFromHeaders.split(',').map(ip => ip.trim());
    return ipList[0];
  }

  // Fallback para IP remoto
  return req.connection.remoteAddress || req.socket.remoteAddress;
}

// Middleware principal atualizado para incluir IP real
app.use((req, res, next) => {
  try {
    // Identificar IP real
    const realIP = getRealClientIP(req);
    req.realIP = realIP; // Adicionar ao objeto de requisição para uso posterior

    console.log(`🌐 [CLIENT] IP real identificado: ${realIP}`);

    next();
  } catch (error) {
    console.error(`❌ [CLIENT] Erro ao identificar IP real: ${error.message}`);
    next(error);
  }
});

// Lista de IPs bloqueados
const blockedIPs = [
  '127.0.0.1', // Exemplo: localhost
  '192.168.0.1' // Exemplo: IP interno
];

// Middleware principal atualizado para bloquear bots e IPs específicos
app.use((req, res, next) => {
  try {
    // Identificar IP real
    const realIP = getRealClientIP(req);
    req.realIP = realIP; // Adicionar ao objeto de requisição para uso posterior

    // Bloquear IPs específicos
    if (blockedIPs.includes(realIP)) {
      console.warn(`🚫 [BLOCKED] Requisição bloqueada - IP: ${realIP}`);
      return res.status(403).send('Acesso negado.');
    }

    // Bloquear bots
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = detectDevice(userAgent);
    if (deviceInfo.isBot) {
      console.warn(`🤖 [BLOCKED] Bot detectado e bloqueado - IP: ${realIP}, User-Agent: ${userAgent}`);
      return res.status(403).send('Acesso negado para bots.');
    }

    console.log(`🌐 [CLIENT] IP real identificado: ${realIP}`);
    next();
  } catch (error) {
    console.error(`❌ [CLIENT] Erro ao identificar IP real: ${error.message}`);
    next(error);
  }
});

// Ajustar logs para formato brasileiro
function formatLogMessage(message) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `[${now}] ${message}`;
}

// Sobrescrever console.log e console.error para usar o formato brasileiro
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => originalLog(formatLogMessage(args.join(' ')));
console.error = (...args) => originalError(formatLogMessage(args.join(' ')));
// Função para limpar cache de geolocalização após período de validade\nasync function cleanGeolocationCache() {\n  try {\n    const expirationTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Cache válido por 24h\n    const { error } = await supabase\n      .from('ip_geo_cache')\n      .delete()\n      .lt('created_at', expirationTime);\n\n    if (error) {\n      console.warn('⚠️ [GEO] Erro ao limpar cache de geolocalização:', error.message);\n    } else {\n      console.log('🧹 [GEO] Cache de geolocalização limpo com sucesso.');\n    }\n  } catch (error) {\n    console.error('❌ [GEO] Erro ao executar limpeza de cache:', error.message);\n  }\n}\n\n// Agendar limpeza de cache diariamente\nsetInterval(cleanGeolocationCache, 24 * 60 * 60 * 1000);
// Adicionando controle para evitar múltiplas chamadas simultâneas à API de geolocalização
const geolocationRequests = new Map();

async function getGeolocationWithControl(ip) {
  if (geolocationRequests.has(ip)) {
    console.log(`🔄 [GEO] Consulta em andamento para IP: ${ip}`);
    return geolocationRequests.get(ip);
  }

  const geolocationPromise = (async () => {
    try {
      const cachedGeo = await getGeolocationFromCache(ip);
      if (cachedGeo) {
        return cachedGeo;
      }

      const geoData = await getGeolocationOriginal(ip);
      return geoData;
    } finally {
      geolocationRequests.delete(ip);
    }
  })();

  geolocationRequests.set(ip, geolocationPromise);
  return geolocationPromise;
}

// Atualizando chamadas existentes para usar o controle de geolocalização
async function handleRequest(req, res) {
  const realIP = getRealClientIP(req);
  const geoInfo = await getGeolocationWithControl(realIP);
  // ... restante do código existente ...
}