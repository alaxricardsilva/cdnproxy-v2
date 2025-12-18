import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { getAnalyticsQueueStatus } from '../../../utils/analytics-collector'

export default defineEventHandler(async (event) => {
  try {
    // Verificar se o usuário tem permissão (admin ou superadmin)
    // Por enquanto, vamos permitir acesso para monitoramento
    
    const queueStatus = getAnalyticsQueueStatus()
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      queue: queueStatus,
      alerts: {
        queueFull: queueStatus.queueSize >= queueStatus.maxQueueSize * 0.8,
        processing: queueStatus.processing,
        highLoad: queueStatus.queueSize > 100
      }
    }
  } catch (error) {
    logger.error('Error getting queue status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})