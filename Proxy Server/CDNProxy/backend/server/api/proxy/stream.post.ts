import { logger } from '~/utils/logger'
import { withAnalytics } from '~/utils/analytics-collector';
import { getClientIP } from '~/utils/ip-detection';

export default withAnalytics(async (event) => {
  try {
    const { url, headers = {} } = await readBody(event);
    
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

    // Headers para o proxy
    const proxyHeaders = {
      'User-Agent': headers['user-agent'] || 'ProxyCDN/1.0',
      'Accept': headers['accept'] || '*/*',
      'Accept-Encoding': headers['accept-encoding'] || 'gzip, deflate',
      'Connection': 'keep-alive',
      ...headers
    };

    // Fazer a requisição proxy
    const response = await $fetch.raw(url, {
      method: 'GET',
      headers: proxyHeaders,
      responseType: 'stream'
    });

    // Definir headers de resposta
    const responseHeaders = {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Content-Length': response.headers.get('content-length'),
      'Cache-Control': response.headers.get('cache-control') || 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

    return response._data;

  } catch (error) {
    logger.error('Erro no proxy de streaming:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    });
  }
});