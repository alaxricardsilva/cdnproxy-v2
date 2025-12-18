import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { getBackgroundTasksStatus } from '../../../utils/background-tasks'

export default defineEventHandler(async (event) => {
  try {
    // Verificar se o usuário tem permissão (admin ou superadmin)
    // Por enquanto, vamos permitir acesso para monitoramento
    
    const tasksStatus = getBackgroundTasksStatus()
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      backgroundTasks: tasksStatus,
      systemHealth: {
        tasksRunning: tasksStatus.running > 0,
        pendingTasks: tasksStatus.pending,
        failedTasks: tasksStatus.failed,
        totalProcessed: tasksStatus.completed,
        alerts: {
          highPendingTasks: tasksStatus.pending > 10,
          failedTasks: tasksStatus.failed > 0,
          systemOverloaded: tasksStatus.running >= 3
        }
      }
    }
  } catch (error) {
    logger.error('Error getting background tasks status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})