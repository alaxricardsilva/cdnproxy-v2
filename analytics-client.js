/**
 * Cliente HTTP para comunicação com o backend remoto de analytics
 * Substitui as importações locais do analytics-collector.ts
 */

const https = require('https');
const http = require('http');

// URL base do backend remoto (corrigido para sempre usar remoto)
const BACKEND_BASE_URL = 'https://api.cdnproxy.top';

/**
 * Faz uma requisição HTTP para o backend remoto
 */
async function makeRequest(endpoint, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BACKEND_BASE_URL}${endpoint}`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ProxyCDN-Analytics/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 segundos de timeout
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const result = responseData ? JSON.parse(responseData) : {};
            resolve(result);
          } else {
            console.warn(`⚠️ [ANALYTICS] Backend retornou status ${res.statusCode}: ${responseData}`);
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        } catch (error) {
          console.error('❌ [ANALYTICS] Erro ao parsear resposta:', error.message);
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ [ANALYTICS] Erro na requisição:', error.message);
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      console.error('❌ [ANALYTICS] Timeout na requisição');
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Coleta e envia logs de acesso para o backend
 */
async function collectAccessLog(logData) {
  try {
    // Validar dados de episódio se presentes
    if (logData.episode_info || logData.session_id) {
      try {
        validateEpisodeData(logData);
      } catch (validationError) {
        console.warn('⚠️ [ANALYTICS] Dados de episódio inválidos:', validationError.message);
        // Continuar sem os dados de episódio se inválidos
        const { episode_info, session_id, change_type, episode_changed, content_id, ...cleanLogData } = logData;
        logData = cleanLogData;
      }
    }

    console.log('📊 [ANALYTICS] Coletando log de acesso:', {
      domain: logData.domain,
      path: logData.path,
      method: logData.method,
      status: logData.status_code,
      ip: logData.client_ip,
      device: logData.device_type,
      episode: logData.episode_info?.identifier || 'N/A',
      session: logData.session_id || 'N/A',
      change_type: logData.change_type || 'N/A'
    });

    const result = await makeRequest('/api/analytics/collect-access-log', 'POST', logData);
    
    if (result.success !== false) {
      console.log('✅ [ANALYTICS] Log de acesso enviado com sucesso');
      
      // Se há dados de episódio, enviar métricas específicas também
      if (logData.episode_info && logData.change_type) {
        try {
          await collectEpisodeMetrics({
            domain: logData.domain,
            session_id: logData.session_id,
            episode_id: logData.episode_info?.identifier, // Extrair o identifier do episode_info
            episode_info: logData.episode_info,
            change_type: logData.change_type,
            content_id: logData.content_id,
            client_ip: logData.client_ip,
            device_type: logData.device_type,
            timestamp: logData.timestamp || new Date().toISOString()
          });
        } catch (episodeError) {
          console.warn('⚠️ [ANALYTICS] Falha ao enviar métricas de episódio:', episodeError.message);
        }
      }
    } else {
      console.warn('⚠️ [ANALYTICS] Falha ao enviar log de acesso:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [ANALYTICS] Erro ao coletar log de acesso:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Wrapper para analytics que executa uma função e coleta métricas
 */
function withAnalytics(fn, context = {}) {
  return async (...args) => {
    const startTime = Date.now();
    let result;
    let error = null;

    try {
      result = await fn(...args);
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Coletar métricas da execução
      const analyticsData = {
        function_name: fn.name || 'anonymous',
        duration_ms: duration,
        success: !error,
        error_message: error ? error.message : null,
        context: context,
        timestamp: (() => {
          const now = new Date();
          const saoPauloOffset = -3 * 60; // UTC-3 em minutos
          const saoPauloTime = new Date(now.getTime() + (saoPauloOffset * 60 * 1000));
          // Formatar com fuso horário de São Paulo (-03:00)
          const isoString = saoPauloTime.toISOString();
          return isoString.replace('Z', '-03:00');
        })()
      };

      try {
        await makeRequest('/api/analytics/collect-function-metrics', 'POST', analyticsData);
        console.log(`📈 [ANALYTICS] Métricas coletadas para ${fn.name}: ${duration}ms`);
      } catch (analyticsError) {
        console.warn('⚠️ [ANALYTICS] Falha ao enviar métricas de função:', analyticsError.message);
      }
    }

    return result;
  };
}

/**
 * Envia dados de streaming para o backend
 */
async function collectStreamingMetrics(streamingData) {
  try {
    console.log('🎥 [ANALYTICS] Coletando métricas de streaming:', {
      domain: streamingData.domain,
      session_id: streamingData.session_id,
      duration: streamingData.duration_seconds,
      bytes: streamingData.bytes_streamed
    });

    const result = await makeRequest('/api/analytics/collect-streaming-metrics', 'POST', streamingData);
    
    if (result.success !== false) {
      console.log('✅ [ANALYTICS] Métricas de streaming enviadas com sucesso');
    } else {
      console.warn('⚠️ [ANALYTICS] Falha ao enviar métricas de streaming:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [ANALYTICS] Erro ao coletar métricas de streaming:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envia dados específicos de episódios para o backend
 */
async function collectEpisodeMetrics(episodeData) {
  try {
    console.log('📺 [ANALYTICS] Coletando métricas de episódio:', {
      domain: episodeData.domain,
      session_id: episodeData.session_id,
      episode_id: episodeData.episode_info?.identifier,
      change_type: episodeData.change_type,
      content_id: episodeData.content_id
    });

    const result = await makeRequest('/api/analytics/collect-episode-metrics', 'POST', episodeData);
    
    if (result.success !== false) {
      console.log('✅ [ANALYTICS] Métricas de episódio enviadas com sucesso');
    } else {
      console.warn('⚠️ [ANALYTICS] Falha ao enviar métricas de episódio:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [ANALYTICS] Erro ao coletar métricas de episódio:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Envia dados de mudança de sessão para o backend
 */
async function collectSessionChange(sessionData) {
  try {
    console.log('🔄 [ANALYTICS] Coletando mudança de sessão:', {
      session_id: sessionData.session_id,
      previous_session: sessionData.previous_session_id,
      change_reason: sessionData.change_reason,
      ip_address: sessionData.client_ip
    });

    const result = await makeRequest('/api/analytics/collect-session-change', 'POST', sessionData);
    
    if (result.success !== false) {
      console.log('✅ [ANALYTICS] Mudança de sessão registrada com sucesso');
    } else {
      console.warn('⚠️ [ANALYTICS] Falha ao registrar mudança de sessão:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [ANALYTICS] Erro ao registrar mudança de sessão:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Valida dados de episódio antes do envio
 */
function validateEpisodeData(episodeData) {
  const required = ['domain', 'client_ip', 'session_id'];
  const missing = required.filter(field => !episodeData[field]);
  
  if (missing.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
  }
  
  // Validar formato do episode_info se presente
  if (episodeData.episode_info) {
    const episodeRequired = ['identifier'];
    const episodeMissing = episodeRequired.filter(field => !episodeData.episode_info[field]);
    
    if (episodeMissing.length > 0) {
      console.warn(`⚠️ [ANALYTICS] Campos de episódio ausentes: ${episodeMissing.join(', ')}`);
    }
  }
  
  return true;
}

/**
 * Testa a conectividade com o backend
 */
async function testBackendConnection() {
  try {
    console.log('🔍 [ANALYTICS] Testando conexão com backend:', BACKEND_BASE_URL);
    
    const result = await makeRequest('/api/health', 'GET');
    
    if (result.success !== false) {
      console.log('✅ [ANALYTICS] Conexão com backend estabelecida');
      return true;
    } else {
      console.warn('⚠️ [ANALYTICS] Backend não está respondendo corretamente');
      return false;
    }
  } catch (error) {
    console.error('❌ [ANALYTICS] Erro ao testar conexão com backend:', error.message);
    return false;
  }
}

module.exports = {
  collectAccessLog,
  withAnalytics,
  collectStreamingMetrics,
  collectEpisodeMetrics,
  collectSessionChange,
  validateEpisodeData,
  testBackendConnection,
  makeRequest
};