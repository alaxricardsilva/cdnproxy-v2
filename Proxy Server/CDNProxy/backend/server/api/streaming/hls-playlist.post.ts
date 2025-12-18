import { logger } from '~/utils/logger'
import { defineEventHandler, readBody, createError } from 'h3'
import { collectStreamingMetrics } from '../../../utils/analytics-collector'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Validações básicas de presença
    if (!body.domainId || !body.sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: domainId, sessionId'
      })
    }

    // Validações de tipo e formato
    if (typeof body.domainId !== 'string' || body.domainId.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'domainId deve ser uma string válida'
      })
    }

    if (typeof body.sessionId !== 'string' || body.sessionId.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'sessionId deve ser uma string válida'
      })
    }

    // Validações opcionais de métricas
    if (body.totalDuration !== undefined && (typeof body.totalDuration !== 'number' || body.totalDuration < 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'totalDuration deve ser um número não negativo'
      })
    }

    if (body.watchedDuration !== undefined && (typeof body.watchedDuration !== 'number' || body.watchedDuration < 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'watchedDuration deve ser um número não negativo'
      })
    }

    if (body.avgBitrate !== undefined && (typeof body.avgBitrate !== 'number' || body.avgBitrate < 0)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'avgBitrate deve ser um número não negativo'
      })
    }
    
    // Coletar métricas de streaming de forma assíncrona
    await collectStreamingMetrics(event, {
      domainId: body.domainId,
      sessionId: body.sessionId,
      startTime: body.startTime ? new Date(body.startTime) : new Date(),
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      totalDuration: body.totalDuration,
      watchedDuration: body.watchedDuration,
      maxQuality: body.maxQuality,
      avgBitrate: body.avgBitrate,
      bufferEvents: body.bufferEvents || 0,
      seekEvents: body.seekEvents || 0,
      errorEvents: body.errorEvents || 0,
      bandwidthConsumed: body.bandwidthConsumed || 0
    })
    
    return {
      success: true,
      message: 'Streaming metrics collected successfully',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Error collecting streaming metrics:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})