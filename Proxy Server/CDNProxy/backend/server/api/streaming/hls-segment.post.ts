import { logger } from '~/utils/logger'
import { defineEventHandler, readBody, createError } from 'h3'
import { collectHLSMetrics } from '../../../utils/analytics-collector'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validar dados obrigatórios
    if (!body.domainId || !body.sessionId || !body.segmentUrl) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: domainId, sessionId, segmentUrl'
      })
    }
    
    // Coletar métricas HLS de forma assíncrona
    await collectHLSMetrics(event, {
      domainId: body.domainId,
      sessionId: body.sessionId,
      segmentUrl: body.segmentUrl,
      playlistUrl: body.playlistUrl,
      bandwidthUsed: body.bandwidthUsed || 0,
      bufferHealth: body.bufferHealth,
      qualityLevel: body.qualityLevel,
      droppedFrames: body.droppedFrames || 0,
      playbackDuration: body.playbackDuration || 10,
      bitrate: body.bitrate,
      resolution: body.resolution
    })
    
    return {
      success: true,
      message: 'HLS metrics collected successfully',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Error collecting HLS metrics:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})