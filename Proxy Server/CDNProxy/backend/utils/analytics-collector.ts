import { logger } from './logger'
import { createClient } from '@supabase/supabase-js'
import { detectRealIP } from './ip-detection'
import { getGeolocation } from './geolocation'
import type { H3Event } from 'h3'

// Configuração do Supabase usando hybrid-auth
import { getSystemClient } from './hybrid-auth'

// Cliente Supabase para analytics
const supabase = getSystemClient()

// Interfaces para tipos de dados
interface AccessLogData {
  domain_id: string
  domain: string
  path: string
  endpoint_type: 'player_api' | 'hls_playlist' | 'hls_segment' | 'other'
  target_url?: string
  client_ip: string
  real_ip: string
  user_agent: string
  referer?: string
  country?: string
  city?: string
  response_time_ms: number
  status_code: number
  bytes_transferred: number
  bytes_sent: number
  content_type?: string
  content_accessed?: string
}

interface HLSMetricsData {
  domain_id: string
  session_id: string
  segment_url: string
  playlist_url?: string
  client_ip: string
  user_agent: string
  bandwidth_used: number
  buffer_health?: number
  quality_level?: string
  dropped_frames?: number
  playback_duration?: number
  bitrate?: number
  resolution?: string
}

interface StreamingMetricsData {
  domain_id: string
  session_id: string
  content_type?: 'movie' | 'series' | 'live_tv' | 'vod'
  content_id?: string
  content_title?: string
  client_ip: string
  user_agent: string
  device_type?: 'browser' | 'iptv' | 'celular' | 'smarttv'
  start_time: Date
  end_time?: Date
  total_duration?: number
  watched_duration?: number
  completion_rate?: number
  max_quality?: string
  avg_bitrate?: number
  buffer_events?: number
  seek_events?: number
  error_events?: number
  bandwidth_consumed: number
}

// Queue para processamento assíncrono
class AnalyticsQueue {
  private queue: Array<{ type: string; data: any }> = []
  private processing = false
  private maxQueueSize = 1000
  private batchSize = 50

  add(type: string, data: any) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Analytics queue is full, dropping oldest entries')
      this.queue.splice(0, this.batchSize)
    }
    
    this.queue.push({ type, data })
    
    if (!this.processing) {
      this.processQueue()
    }
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize)
        await this.processBatch(batch)
        
        // Pequena pausa para não sobrecarregar o banco
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } catch (error) {
      logger.error('Error processing analytics queue:', error)
    } finally {
      this.processing = false
    }
  }

  private async processBatch(batch: Array<{ type: string; data: any }>) {
    if (!supabase) {
      console.warn('Supabase not configured, skipping analytics batch processing')
      return
    }

    try {
      const accessLogs = batch.filter(item => item.type === 'access_log').map(item => item.data)
      const hlsMetrics = batch.filter(item => item.type === 'hls_metrics').map(item => item.data)
      const streamingMetrics = batch.filter(item => item.type === 'streaming_metrics').map(item => item.data)

      // Inserir access logs
      if (accessLogs.length > 0) {
        const { error: accessError } = await supabase
          .from('access_logs')
          .insert(accessLogs)
        
        if (accessError) {
          logger.error('Error inserting access logs:', accessError)
        }
      }

      // Inserir HLS metrics
      if (hlsMetrics.length > 0) {
        const { error: hlsError } = await supabase
          .from('hls_metrics')
          .insert(hlsMetrics)
        
        if (hlsError) {
          logger.error('Error inserting HLS metrics:', hlsError)
        }
      }

      // Inserir streaming metrics
      if (streamingMetrics.length > 0) {
        const { error: streamingError } = await supabase
          .from('streaming_metrics')
          .insert(streamingMetrics)
        
        if (streamingError) {
          logger.error('Error inserting streaming metrics:', streamingError)
        }
      }

      logger.info(`Processed batch: ${accessLogs.length} access logs, ${hlsMetrics.length} HLS metrics, ${streamingMetrics.length} streaming metrics`)
    } catch (error) {
      logger.error('Error processing analytics batch:', error)
    }
  }

  getStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      maxQueueSize: this.maxQueueSize
    }
  }
}

// Instância global da queue
const analyticsQueue = new AnalyticsQueue()

// Funções utilitárias
function detectEndpointType(path: string): 'player_api' | 'hls_playlist' | 'hls_segment' | 'other' {
  if (path.includes('player_api.php')) return 'player_api'
  if (path.endsWith('.m3u8')) return 'hls_playlist'
  if (path.endsWith('.ts') || path.endsWith('.m4s')) return 'hls_segment'
  return 'other'
}

function detectDeviceType(userAgent: string): 'browser' | 'iptv' | 'celular' | 'smarttv' {
  const ua = userAgent.toLowerCase()
  
  if (ua.includes('kodi') || ua.includes('vlc') || ua.includes('exoplayer')) return 'iptv'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'celular'
  if (ua.includes('smart') || ua.includes('tv') || ua.includes('roku')) return 'smarttv'
  return 'browser'
}

function extractContentInfo(path: string) {
  // Extrair informações do conteúdo baseado no path
  const segments = path.split('/')
  
  if (path.includes('/movie/')) {
    return {
      content_type: 'movie' as const,
      content_id: segments[segments.length - 1]?.replace(/\.(mp4|mkv|avi)$/, ''),
      content_title: segments[segments.length - 1]?.replace(/\.(mp4|mkv|avi)$/, '').replace(/[-_]/g, ' ')
    }
  }
  
  if (path.includes('/series/')) {
    return {
      content_type: 'series' as const,
      content_id: segments[segments.length - 1]?.replace(/\.(mp4|mkv|avi)$/, ''),
      content_title: segments[segments.length - 1]?.replace(/\.(mp4|mkv|avi)$/, '').replace(/[-_]/g, ' ')
    }
  }
  
  if (path.includes('/live/')) {
    return {
      content_type: 'live_tv' as const,
      content_id: segments[2] || 'unknown',
      content_title: segments[2]?.replace(/[-_]/g, ' ') || 'Live Channel'
    }
  }
  
  return {
    content_type: 'vod' as const,
    content_id: 'unknown',
    content_title: 'Unknown Content'
  }
}

// Funções principais de coleta
export async function collectAccessLog(event: H3Event, options: {
  domainId: string
  domain: string
  targetUrl?: string
  responseTimeMs: number
  statusCode: number
  bytesTransferred: number
  bytesSent: number
  contentType?: string
}) {
  try {
    const ipDetection = detectRealIP(event)
    const userAgent = getHeader(event, 'user-agent') || ''
    const referer = getHeader(event, 'referer')
    const path = getRequestURL(event).pathname
    
    // Obter geolocalização real baseada no IP
    const geo = await getGeolocation(ipDetection.ip)
    
    const accessLogData: AccessLogData = {
      domain_id: options.domainId,
      domain: options.domain,
      path,
      endpoint_type: detectEndpointType(path),
      target_url: options.targetUrl,
      client_ip: ipDetection.ip,
      real_ip: ipDetection.ip,
      user_agent: userAgent,
      referer,
      country: geo.country,
      city: geo.city,
      response_time_ms: options.responseTimeMs,
      status_code: options.statusCode,
      bytes_transferred: options.bytesTransferred,
      bytes_sent: options.bytesSent,
      content_type: options.contentType,
      content_accessed: extractContentInfo(path).content_title
    }
    
    analyticsQueue.add('access_log', accessLogData)
  } catch (error) {
    logger.error('Error collecting access log:', error)
  }
}

export async function collectHLSMetrics(event: H3Event, options: {
  domainId: string
  sessionId: string
  segmentUrl: string
  playlistUrl?: string
  bandwidthUsed: number
  bufferHealth?: number
  qualityLevel?: string
  droppedFrames?: number
  playbackDuration?: number
  bitrate?: number
  resolution?: string
}) {
  try {
    const ipDetection = detectRealIP(event)
    const userAgent = getHeader(event, 'user-agent') || ''
    
    const hlsMetricsData: HLSMetricsData = {
      domain_id: options.domainId,
      session_id: options.sessionId,
      segment_url: options.segmentUrl,
      playlist_url: options.playlistUrl,
      client_ip: ipDetection.ip,
      user_agent: userAgent,
      bandwidth_used: options.bandwidthUsed,
      buffer_health: options.bufferHealth,
      quality_level: options.qualityLevel,
      dropped_frames: options.droppedFrames,
      playback_duration: options.playbackDuration,
      bitrate: options.bitrate,
      resolution: options.resolution
    }
    
    analyticsQueue.add('hls_metrics', hlsMetricsData)
  } catch (error) {
    logger.error('Error collecting HLS metrics:', error)
  }
}

export async function collectStreamingMetrics(event: H3Event, options: {
  domainId: string
  sessionId: string
  startTime: Date
  endTime?: Date
  totalDuration?: number
  watchedDuration?: number
  maxQuality?: string
  avgBitrate?: number
  bufferEvents?: number
  seekEvents?: number
  errorEvents?: number
  bandwidthConsumed: number
}) {
  try {
    const ipDetection = detectRealIP(event)
    const userAgent = getHeader(event, 'user-agent') || ''
    const path = getRequestURL(event).pathname
    const contentInfo = extractContentInfo(path)
    
    const streamingMetricsData: StreamingMetricsData = {
      domain_id: options.domainId,
      session_id: options.sessionId,
      content_type: contentInfo.content_type,
      content_id: contentInfo.content_id,
      content_title: contentInfo.content_title,
      client_ip: ipDetection.ip,
      user_agent: userAgent,
      device_type: detectDeviceType(userAgent),
      start_time: options.startTime,
      end_time: options.endTime,
      total_duration: options.totalDuration,
      watched_duration: options.watchedDuration,
      completion_rate: options.watchedDuration && options.totalDuration 
        ? (options.watchedDuration / options.totalDuration) * 100 
        : undefined,
      max_quality: options.maxQuality,
      avg_bitrate: options.avgBitrate,
      buffer_events: options.bufferEvents,
      seek_events: options.seekEvents,
      error_events: options.errorEvents,
      bandwidth_consumed: options.bandwidthConsumed
    }
    
    analyticsQueue.add('streaming_metrics', streamingMetricsData)
  } catch (error) {
    logger.error('Error collecting streaming metrics:', error)
  }
}

// Middleware para coleta automática
export function withAnalytics(domainId: string, domain: string) {
  return async (event: H3Event, next: () => Promise<any>) => {
    const startTime = Date.now()
    const path = getRequestURL(event).pathname
    
    try {
      const result = await next()
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      // Coletar access log para todos os endpoints
      await collectAccessLog(event, {
        domainId,
        domain,
        responseTimeMs: responseTime,
        statusCode: 200,
        bytesTransferred: result?.length || 0,
        bytesSent: result?.length || 0
      })
      
      // Coletar métricas específicas para streaming
      if (detectEndpointType(path) === 'hls_segment' || detectEndpointType(path) === 'hls_playlist') {
        const sessionId = getHeader(event, 'x-session-id') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        await collectHLSMetrics(event, {
          domainId,
          sessionId,
          segmentUrl: path,
          bandwidthUsed: result?.length || 0,
          playbackDuration: 10 // Duração padrão do segmento
        })
      }
      
      return result
    } catch (error) {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      // Coletar log de erro
      await collectAccessLog(event, {
        domainId,
        domain,
        responseTimeMs: responseTime,
        statusCode: 500,
        bytesTransferred: 0,
        bytesSent: 0
      })
      
      throw error
    }
  }
}

// Função para obter status da queue
export function getAnalyticsQueueStatus() {
  return analyticsQueue.getStatus()
}

// Importações necessárias do h3
import { getHeader, getRequestURL } from 'h3'