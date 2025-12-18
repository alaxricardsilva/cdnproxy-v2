import { logger } from '~/utils/logger'
/**
 * Utilitário para validação de URLs com suporte a portas customizadas
 */

/**
 * Valida se uma URL é válida e aceita portas customizadas
 * @param url - URL a ser validada
 * @returns boolean - true se a URL for válida
 */
export function isValidUrlWithPort(url: string): boolean {
  try {
    // Verificar se a string não está vazia
    if (!url || typeof url !== 'string') {
      return false
    }

    // Criar objeto URL para validação
    const urlObj = new URL(url)
    
    // Verificar se o protocolo é válido (http ou https)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }

    // Verificar se o hostname é válido
    if (!urlObj.hostname) {
      return false
    }

    // Verificar se a porta é válida (se especificada)
    if (urlObj.port) {
      const portNum = parseInt(urlObj.port, 10)
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return false
      }
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * Normaliza uma URL garantindo que tenha protocolo
 * @param url - URL a ser normalizada
 * @returns string - URL normalizada
 */
export function normalizeUrl(url: string): string {
  if (!url) return url

  // Se não tem protocolo, adicionar http://
  if (!url.match(/^https?:\/\//)) {
    return `http://${url}`
  }

  return url
}

/**
 * Extrai informações da URL incluindo porta
 * @param url - URL a ser analisada
 * @returns objeto com informações da URL
 */
export function parseUrlInfo(url: string) {
  try {
    const urlObj = new URL(url)
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      origin: urlObj.origin
    }
  } catch (error) {
    return null
  }
}

/**
 * Valida se uma URL de destino é adequada para proxy
 * @param url - URL de destino
 * @returns objeto com resultado da validação
 */
export function validateTargetUrl(url: string) {
  const normalizedUrl = normalizeUrl(url)
  
  if (!isValidUrlWithPort(normalizedUrl)) {
    return {
      valid: false,
      error: 'URL de destino inválida. Use formato: http://exemplo.com:8080 ou https://exemplo.com'
    }
  }

  const urlInfo = parseUrlInfo(normalizedUrl)
  if (!urlInfo) {
    return {
      valid: false,
      error: 'Não foi possível analisar a URL fornecida'
    }
  }

  // Verificar se não é localhost em produção (opcional)
  if (process.env.NODE_ENV === 'production' && 
      (urlInfo.hostname === 'localhost' || urlInfo.hostname === '127.0.0.1')) {
    return {
      valid: false,
      error: 'URLs localhost não são permitidas em produção'
    }
  }

  return {
    valid: true,
    url: normalizedUrl,
    info: urlInfo
  }
}