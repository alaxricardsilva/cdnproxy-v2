import { logger } from '~/utils/logger'
import { getHeader, defineEventHandler } from 'h3'

/**
 * Configurações para detecção de IP
 */
export interface IPDetectionConfig {
  headers: string[]
  validateFormat: boolean
  trustCloudflare: boolean
  trustProxy: boolean
  allowPrivateIPs: boolean
}

/**
 * Resultado da detecção de IP
 */
export interface IPDetectionResult {
  ip: string
  source: string
  isCloudflare: boolean
  isProxy: boolean
  isPrivate: boolean
  isValid: boolean
  allHeaders: Record<string, string>
}

/**
 * Configuração padrão para detecção de IP
 */
const DEFAULT_CONFIG: IPDetectionConfig = {
  headers: [
    'cf-connecting-ip',           // Cloudflare
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
  ],
  validateFormat: true,
  trustCloudflare: true,
  trustProxy: true,
  allowPrivateIPs: false
}

/**
 * Valida se um IP está em formato válido
 */
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // IPv6 regex (simplificado)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Verifica se um IP é privado/local
 */
function isPrivateIP(ip: string): boolean {
  if (!isValidIP(ip)) return false
  
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
  ]
  
  return privateRanges.some(range => range.test(ip))
}

/**
 * Verifica se o request vem do Cloudflare
 */
function isCloudflareRequest(headers: Record<string, string>): boolean {
  return !!(
    headers['cf-connecting-ip'] ||
    headers['cf-ray'] ||
    headers['cf-visitor'] ||
    headers['cf-ipcountry']
  )
}

/**
 * Verifica se o request vem de um proxy
 */
function isProxyRequest(headers: Record<string, string>): boolean {
  return !!(
    headers['x-forwarded-for'] ||
    headers['x-real-ip'] ||
    headers['x-client-ip'] ||
    headers['forwarded'] ||
    headers['x-forwarded']
  )
}

/**
 * Extrai IP de X-Forwarded-For (pode conter múltiplos IPs)
 */
function extractIPFromForwarded(forwardedHeader: string): string {
  // X-Forwarded-For pode ter formato: "client, proxy1, proxy2"
  // Queremos o primeiro IP (cliente original)
  const ips = forwardedHeader.split(',').map(ip => ip.trim())
  return ips[0] || ''
}

/**
 * Detecta o IP real do cliente
 */
export function detectRealIP(event: any, config: Partial<IPDetectionConfig> = {}): IPDetectionResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Coletar todos os headers relevantes
  const allHeaders: Record<string, string> = {}
  finalConfig.headers.forEach(headerName => {
    const value = getHeader(event, headerName)
    if (value) {
      allHeaders[headerName] = value
    }
  })
  
  let detectedIP = '127.0.0.1'
  let source = 'fallback'
  
  // Tentar detectar IP seguindo a ordem de prioridade
  for (const headerName of finalConfig.headers) {
    const headerValue = allHeaders[headerName]
    if (!headerValue) continue
    
    let candidateIP = headerValue
    
    // Tratar X-Forwarded-For especialmente
    if (headerName === 'x-forwarded-for') {
      candidateIP = extractIPFromForwarded(headerValue)
    }
    
    // Validar formato se configurado
    if (finalConfig.validateFormat && !isValidIP(candidateIP)) {
      continue
    }
    
    // Verificar se é IP privado
    const isPrivate = isPrivateIP(candidateIP)
    if (!finalConfig.allowPrivateIPs && isPrivate) {
      continue
    }
    
    // Se chegou até aqui, é um IP válido
    detectedIP = candidateIP
    source = headerName
    break
  }
  
  const isCloudflare = isCloudflareRequest(allHeaders)
  const isProxy = isProxyRequest(allHeaders)
  const isPrivate = isPrivateIP(detectedIP)
  const isValid = isValidIP(detectedIP)
  
  return {
    ip: detectedIP,
    source,
    isCloudflare,
    isProxy,
    isPrivate,
    isValid,
    allHeaders
  }
}

/**
 * Função simplificada para obter apenas o IP
 */
export function getClientIP(event: any, config: Partial<IPDetectionConfig> = {}): string {
  return detectRealIP(event, config).ip
}

/**
 * Middleware para adicionar IP detection aos eventos
 */
export function withIPDetection(handler: any, config: Partial<IPDetectionConfig> = {}) {
  return defineEventHandler(async (event) => {
    // Adicionar informações de IP ao contexto do evento
    event.context.ipDetection = detectRealIP(event, config)
    event.context.clientIP = event.context.ipDetection.ip
    
    return handler(event)
  })
}

/**
 * Configurações específicas para diferentes cenários
 */
export const IP_CONFIGS = {
  // Configuração para Cloudflare
  cloudflare: {
    headers: ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'],
    trustCloudflare: true,
    trustProxy: true,
    validateFormat: true,
    allowPrivateIPs: false
  } as IPDetectionConfig,
  
  // Configuração para proxy reverso (Nginx, Apache)
  reverseProxy: {
    headers: ['x-real-ip', 'x-forwarded-for', 'x-client-ip'],
    trustProxy: true,
    validateFormat: true,
    allowPrivateIPs: false
  } as IPDetectionConfig,
  
  // Configuração para CDN
  cdn: {
    headers: ['true-client-ip', 'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
    trustProxy: true,
    validateFormat: true,
    allowPrivateIPs: false
  } as IPDetectionConfig,
  
  // Configuração para desenvolvimento (permite IPs privados)
  development: {
    headers: ['x-forwarded-for', 'x-real-ip', 'remote-addr'],
    validateFormat: true,
    allowPrivateIPs: true
  } as IPDetectionConfig,
  
  // Configuração estrita (máxima segurança)
  strict: {
    headers: ['cf-connecting-ip', 'x-real-ip'],
    trustCloudflare: true,
    trustProxy: false,
    validateFormat: true,
    allowPrivateIPs: false
  } as IPDetectionConfig
}