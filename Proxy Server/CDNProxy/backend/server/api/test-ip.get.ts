import { logger } from '~/utils/logger'
import { getHeaders, getHeader, getMethod, getRequestURL, defineEventHandler } from 'h3'
import { detectRealIP, getClientIP, IP_CONFIGS } from '../../utils/ip-detection'

export default defineEventHandler(async (event) => {
  try {
    // Usar o novo sistema de detecção de IP
    const ipDetection = detectRealIP(event, IP_CONFIGS.cloudflare)
    
    // Coletar todos os headers relevantes
    const allHeaders = getHeaders(event)
    const ipHeaders = {}
    
    // Filtrar headers relacionados a IP
    Object.keys(allHeaders).forEach(key => {
      const lowerKey = key.toLowerCase()
      if (lowerKey.includes('cf-') || 
          lowerKey.includes('x-forwarded') || 
          lowerKey.includes('x-real') ||
          lowerKey.includes('remote') ||
          lowerKey.includes('client') ||
          lowerKey.includes('forwarded')) {
        ipHeaders[key] = allHeaders[key]
      }
    })

    const userAgent = getHeader(event, 'user-agent')
    const host = getHeader(event, 'host')

    return {
      success: true,
      timestamp: new Date().toISOString(),
      detectedIP: ipDetection.ip,
      ipSource: ipDetection.source,
      ipValidation: {
        isValid: ipDetection.isValid,
        isPrivate: ipDetection.isPrivate,
        isCloudflare: ipDetection.isCloudflare,
        isProxy: ipDetection.isProxy
      },
      ipHeaders: ipHeaders,
      allHeaders: allHeaders,
      userAgent: userAgent,
      host: host,
      method: getMethod(event),
      url: getRequestURL(event).toString(),
      ipDetectionOrder: [
        'cf-connecting-ip (Cloudflare - Prioridade Máxima)',
        'cf-visitor (Cloudflare Visitor Info)',
        'x-forwarded-for (Proxy/Load Balancer)', 
        'x-real-ip (Nginx/Proxy)',
        'x-client-ip (Apache/IIS)',
        'x-cluster-client-ip (Cluster)',
        'true-client-ip (Akamai/CloudFlare)',
        'x-original-forwarded-for (AWS ELB)',
        'remote-addr (Direct Connection)',
        '127.0.0.1 (Fallback)'
      ],
      detectionMethods: {
        cloudflare: {
          description: 'Detecção via Cloudflare headers',
          headers: ['cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry'],
          detected: ipDetection.isCloudflare
        },
        reverseProxy: {
          description: 'Detecção via Proxy Reverso (Nginx, Apache)',
          headers: ['x-real-ip', 'x-forwarded-for', 'x-client-ip'],
          detected: ipDetection.isProxy && !ipDetection.isCloudflare
        },
        cdn: {
          description: 'Detecção via CDN (Akamai, etc)',
          headers: ['true-client-ip', 'x-original-forwarded-for'],
          detected: !!(getHeader(event, 'true-client-ip') || getHeader(event, 'x-original-forwarded-for'))
        },
        tunnel: {
          description: 'Detecção via Cloudflare Tunnel',
          headers: ['cf-connecting-ip', 'cf-visitor'],
          detected: !!(getHeader(event, 'cf-connecting-ip') && getHeader(event, 'cf-visitor'))
        }
      },
      notes: {
        cloudflareDetected: ipDetection.isCloudflare,
        proxyDetected: ipDetection.isProxy,
        directConnection: !ipDetection.isCloudflare && !ipDetection.isProxy,
        ipValidation: ipDetection.isValid ? 'Valid IP format' : 'Invalid IP format',
        privateIP: ipDetection.isPrivate ? 'Private/Local IP detected' : 'Public IP detected'
      }
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
})