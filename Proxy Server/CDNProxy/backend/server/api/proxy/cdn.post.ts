import { logger } from '~/utils/logger'
import { withAnalytics } from '~/utils/analytics-collector';
import { getClientIP } from '~/utils/ip-detection';

export default withAnalytics(async (event) => {
  try {
    const { url, method = 'GET', headers = {}, body } = await readBody(event);
    
    if (!url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'URL é obrigatória'
      });
    }

    // Validar se é uma URL válida
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: 'URL inválida'
      });
    }

    // Headers para o proxy CDN
    const proxyHeaders = {
      'User-Agent': headers['user-agent'] || 'ProxyCDN/1.0',
      'Accept': headers['accept'] || '*/*',
      'Accept-Encoding': headers['accept-encoding'] || 'gzip, deflate, br',
      'Cache-Control': headers['cache-control'] || 'public, max-age=86400',
      'Connection': 'keep-alive',
      'X-Forwarded-For': getClientIP(event),
      'X-Real-IP': getClientIP(event),
      ...headers
    };

    // Configurações da requisição
    const requestConfig = {
      method: method.toUpperCase(),
      headers: proxyHeaders,
      timeout: 30000, // 30 segundos
    };

    // Adicionar body se necessário
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestConfig.body = body;
    }

    // Fazer a requisição proxy
    const response = await $fetch.raw(url, requestConfig);

    // Headers de resposta CDN
    const responseHeaders = {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Content-Length': response.headers.get('content-length'),
      'Cache-Control': response.headers.get('cache-control') || 'public, max-age=86400',
      'ETag': response.headers.get('etag'),
      'Last-Modified': response.headers.get('last-modified'),
      'Expires': response.headers.get('expires'),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
      'X-Proxy-CDN': 'ProxyCDN/1.0',
      'X-Cache-Status': 'MISS' // Pode ser implementado cache posteriormente
    };

    // Remover headers nulos
    Object.keys(responseHeaders).forEach(key => {
      if (typeof responseHeaders[key] === null || responseHeaders[key] === 'undefined' || responseHeaders[key] === null || responseHeaders[key] === null) {
        delete responseHeaders[key];
      }
    });

    // Definir headers na resposta
    Object.entries(responseHeaders).forEach(([key, value]) => {
      setHeader(event, key, value);
    });

    // Definir status code
    setResponseStatus(event, response.status);

    return response._data;

  } catch (error) {
    logger.error('Erro no proxy CDN:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    });
  }
});