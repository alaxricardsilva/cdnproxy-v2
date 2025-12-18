/**
 * Cliente HTTP para comunicação com o backend remoto de analytics
 * Substitui as importações locais do analytics-collector.ts
 */

const https = require('https');
const http = require('http');

// Importar utilitários de timezone
const { toSaoPauloISOString } = require('./backend/utils/timezone-cjs.js');

// URL base do backend remoto
const BACKEND_BASE_URL = process.env.BACKEND_URL || 'https://api.cdnproxy.top';

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
 * Coleta log de acesso e envia para o backend remoto
 */
async function collectAccessLog(logData) {
  try {
    console.log('📊 [ANALYTICS] Coletando log de acesso:', {
      domain: logData.domain,
      path: logData.path,
      method: logData.method,
      status: logData.status_code,
      ip: logData.client_ip,
      device: logData.device_type
    });

    const result = await makeRequest('/api/analytics/collect-access-log', 'POST', logData);
    
    if (result.success !== false) {
      console.log('✅ [ANALYTICS] Log de acesso enviado com sucesso');
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
        timestamp: toSaoPauloISOString()
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
  testBackendConnection,
  makeRequest
};