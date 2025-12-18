import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { 
  scheduleAnalyticsAggregation,
  scheduleDataCleanup,
  scheduleReportGeneration,
  scheduleBandwidthCalculation
} from '../../../utils/background-tasks'

export default defineEventHandler(async (event) => {
  try {
    // Verificar se o usuário tem permissão (admin ou superadmin)
    // Por enquanto, vamos permitir acesso para testes
    
    const body = await readBody(event)
    const { taskType, data = {} } = body

    if (!taskType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Task type is required'
      })
    }

    let taskId: string

    switch (taskType) {
      case 'analytics_aggregation':
        taskId = scheduleAnalyticsAggregation(data.domainId, data.period)
        break
      
      case 'data_cleanup':
        taskId = scheduleDataCleanup(data.retentionDays)
        break
      
      case 'report_generation':
        if (!data.domainId || !data.reportType) {
          throw createError({
            statusCode: 400,
            statusMessage: 'domainId and reportType are required for report generation'
          })
        }
        taskId = scheduleReportGeneration(data.domainId, data.reportType, data.email)
        break
      
      case 'bandwidth_calculation':
        taskId = scheduleBandwidthCalculation(data.domainId, data.period)
        break
      
      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Unknown task type: ${taskType}`
        })
    }

    return {
      success: true,
      message: 'Background task scheduled successfully',
      taskId,
      taskType,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Error scheduling background task:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})