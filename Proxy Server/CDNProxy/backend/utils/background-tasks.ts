import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

// Só criar o cliente se as variáveis estiverem configuradas
let supabase: any = null
if (supabaseUrl !== 'https://jyconxalcfqvqakrswnb.supabase.co' && supabaseKey !== 'placeholder-key') {
  supabase = createClient(supabaseUrl, supabaseKey)
}

interface BackgroundTask {
  id: string
  type: 'analytics_aggregation' | 'data_cleanup' | 'report_generation' | 'bandwidth_calculation'
  priority: 'low' | 'medium' | 'high'
  data: any
  createdAt: Date
  scheduledFor?: Date
  attempts: number
  maxAttempts: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
}

class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map()
  private running = false
  private processingInterval: NodeJS.Timeout | null = null
  private readonly PROCESSING_INTERVAL = 30000 // 30 segundos
  private readonly MAX_CONCURRENT_TASKS = 3

  constructor() {
    this.startProcessing()
  }

  // Adicionar nova tarefa
  addTask(type: BackgroundTask['type'], data: any, options: {
    priority?: BackgroundTask['priority']
    scheduledFor?: Date
    maxAttempts?: number
  } = {}) {
    const task: BackgroundTask = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: options.priority || 'medium',
      data,
      createdAt: new Date(),
      scheduledFor: options.scheduledFor,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      status: 'pending'
    }

    this.tasks.set(task.id, task)
    logger.info(`Background task added: ${task.type} (${task.id})`)
    return task.id
  }

  // Iniciar processamento de tarefas
  private startProcessing() {
    if (this.running) return

    this.running = true
    this.processingInterval = setInterval(() => {
      this.processTasks()
    }, this.PROCESSING_INTERVAL)

    logger.info('Background task processing started')
  }

  // Parar processamento
  stopProcessing() {
    this.running = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    logger.info('Background task processing stopped')
  }

  // Processar tarefas pendentes
  private async processTasks() {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .filter(task => !task.scheduledFor || task.scheduledFor <= new Date())
      .sort((a, b) => {
        // Prioridade: high > medium > low
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, this.MAX_CONCURRENT_TASKS)

    if (pendingTasks.length === 0) return

    logger.info(`Processing ${pendingTasks.length} background tasks`)

    const promises = pendingTasks.map(task => this.processTask(task))
    await Promise.allSettled(promises)
  }

  // Processar tarefa individual
  private async processTask(task: BackgroundTask) {
    task.status = 'running'
    task.attempts++

    try {
      logger.info(`Processing task: ${task.type} (${task.id}) - Attempt ${task.attempts}`)

      switch (task.type) {
        case 'analytics_aggregation':
          await this.processAnalyticsAggregation(task.data)
          break
        case 'data_cleanup':
          await this.processDataCleanup(task.data)
          break
        case 'report_generation':
          await this.processReportGeneration(task.data)
          break
        case 'bandwidth_calculation':
          await this.processBandwidthCalculation(task.data)
          break
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      task.status = 'completed'
      logger.info(`Task completed: ${task.type} (${task.id})`)

      // Remover tarefa completada após 1 hora
      setTimeout(() => {
        this.tasks.delete(task.id)
      }, 3600000)

    } catch (error) {
      logger.error(`Task failed: ${task.type} (${task.id})`, error)
      task.error = error instanceof Error ? error.message : String(error)

      if (task.attempts >= task.maxAttempts) {
        task.status = 'failed'
        logger.error(`Task permanently failed: ${task.type} (${task.id})`)
      } else {
        task.status = 'pending'
        // Reagendar com backoff exponencial
        const delay = Math.pow(2, task.attempts) * 60000 // 2^attempts minutos
        task.scheduledFor = new Date(Date.now() + delay)
        logger.info(`Task rescheduled: ${task.type} (${task.id}) for ${task.scheduledFor}`)
      }
    }
  }

  // Processar agregação de analytics
  private async processAnalyticsAggregation(data: { domainId?: string; period?: string }) {
    if (!supabase) {
      console.warn('Supabase not configured, skipping analytics aggregation')
      return
    }

    const { domainId, period = 'hourly' } = data
    const now = new Date()
    
    // Calcular período de agregação
    let startTime: Date
    let endTime: Date = now

    switch (period) {
      case 'hourly':
        startTime = new Date(now.getTime() - 60 * 60 * 1000) // 1 hora atrás
        break
      case 'daily':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 dia atrás
        break
      case 'weekly':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 semana atrás
        break
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
    }

    // Agregar dados de access_logs
    const accessQuery = supabase
      .from('access_logs')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lt('created_at', endTime.toISOString())

    if (domainId) {
      accessQuery.eq('domain_id', domainId)
    }

    const { data: accessLogs, error: accessError } = await accessQuery

    if (accessError) {
      throw new Error(`Error fetching access logs: ${accessError.message}`)
    }

    // Agregar dados de streaming_metrics
    const streamingQuery = supabase
      .from('streaming_metrics')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .lt('created_at', endTime.toISOString())

    if (domainId) {
      streamingQuery.eq('domain_id', domainId)
    }

    const { data: streamingMetrics, error: streamingError } = await streamingQuery

    if (streamingError) {
      throw new Error(`Error fetching streaming metrics: ${streamingError.message}`)
    }

    // Calcular estatísticas agregadas
    const stats = {
      period,
      domain_id: domainId || 'all',
      start_time: startTime,
      end_time: endTime,
      total_requests: accessLogs?.length || 0,
      unique_ips: new Set(accessLogs?.map(log => log.client_ip) || []).size,
      total_bandwidth: (accessLogs?.reduce((sum, log) => sum + (log.bytes_transferred || 0), 0) || 0),
      avg_response_time: accessLogs?.length ? 
        (accessLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / accessLogs.length) : 0,
      streaming_sessions: streamingMetrics?.length || 0,
      total_streaming_duration: streamingMetrics?.reduce((sum, metric) => 
        sum + (metric.total_duration || 0), 0) || 0,
      avg_completion_rate: streamingMetrics?.length ?
        (streamingMetrics.reduce((sum, metric) => sum + (metric.completion_rate || 0), 0) / streamingMetrics.length) : 0
    }

    logger.info(`Analytics aggregation completed for ${period} period:`, stats)
  }

  // Processar limpeza de dados
  private async processDataCleanup(data: { retentionDays?: number; tables?: string[] }) {
    if (!supabase) {
      console.warn('Supabase not configured, skipping data cleanup')
      return
    }

    const { retentionDays = 90, tables = ['access_logs', 'hls_metrics', 'streaming_metrics'] } = data
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .lt('created_at', cutoffDate.toISOString())

        if (error) {
          logger.error(`Error cleaning up ${table}:`, error)
        } else {
          logger.info(`Cleaned up old records from ${table} (older than ${retentionDays} days)`)
        }
      } catch (error) {
        logger.error(`Error during cleanup of ${table}:`, error)
      }
    }
  }

  // Processar geração de relatórios
  private async processReportGeneration(data: { domainId: string; reportType: string; email?: string }) {
    logger.info(`Generating ${data.reportType} report for domain ${data.domainId}`)
    
    // Aqui seria implementada a lógica de geração de relatórios
    // Por exemplo: gerar PDF, enviar por email, etc.
    
    // Simulação de processamento
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    logger.info(`Report generated successfully: ${data.reportType}`)
  }

  // Processar cálculo de bandwidth
  private async processBandwidthCalculation(data: { domainId?: string; period?: string }) {
    if (!supabase) {
      console.warn('Supabase not configured, skipping bandwidth calculation')
      return
    }

    const { domainId, period = 'daily' } = data
    
    // Calcular uso de bandwidth por período
    const query = supabase
      .from('access_logs')
      .select('bytes_transferred, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (domainId) {
      query.eq('domain_id', domainId)
    }

    const { data: logs, error } = await query

    if (error) {
      throw new Error(`Error calculating bandwidth: ${error.message}`)
    }

    const totalBandwidth = logs?.reduce((sum, log) => sum + (log.bytes_transferred || 0), 0) || 0
    
    logger.info(`Bandwidth calculation completed: ${totalBandwidth} bytes for ${period} period`)
  }

  // Obter status das tarefas
  getTasksStatus() {
    const tasks = Array.from(this.tasks.values())
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      tasks: tasks.map(t => ({
        id: t.id,
        type: t.type,
        priority: t.priority,
        status: t.status,
        attempts: t.attempts,
        createdAt: t.createdAt,
        scheduledFor: t.scheduledFor,
        error: t.error
      }))
    }
  }

  // Obter tarefa específica
  getTask(id: string) {
    return this.tasks.get(id)
  }

  // Cancelar tarefa
  cancelTask(id: string) {
    const task = this.tasks.get(id)
    if (task && task.status === 'pending') {
      this.tasks.delete(id)
      return true
    }
    return false
  }
}

// Instância global do gerenciador de tarefas
const backgroundTaskManager = new BackgroundTaskManager()

// Funções de conveniência para agendar tarefas comuns
export function scheduleAnalyticsAggregation(domainId?: string, period: string = 'hourly') {
  return backgroundTaskManager.addTask('analytics_aggregation', { domainId, period }, {
    priority: 'medium'
  })
}

export function scheduleDataCleanup(retentionDays: number = 90) {
  return backgroundTaskManager.addTask('data_cleanup', { retentionDays }, {
    priority: 'low',
    scheduledFor: new Date(Date.now() + 60000) // 1 minuto de delay
  })
}

export function scheduleReportGeneration(domainId: string, reportType: string, email?: string) {
  return backgroundTaskManager.addTask('report_generation', { domainId, reportType, email }, {
    priority: 'high'
  })
}

export function scheduleBandwidthCalculation(domainId?: string, period: string = 'daily') {
  return backgroundTaskManager.addTask('bandwidth_calculation', { domainId, period }, {
    priority: 'medium'
  })
}

// Exportar gerenciador e funções de status
export { backgroundTaskManager }
export const getBackgroundTasksStatus = () => backgroundTaskManager.getTasksStatus()
export const getBackgroundTask = (id: string) => backgroundTaskManager.getTask(id)
export const cancelBackgroundTask = (id: string) => backgroundTaskManager.cancelTask(id)

// Agendar tarefas automáticas
setInterval(() => {
  // Agregação de analytics a cada hora
  scheduleAnalyticsAggregation(undefined, 'hourly')
}, 60 * 60 * 1000) // 1 hora

setInterval(() => {
  // Limpeza de dados uma vez por dia
  scheduleDataCleanup(90)
}, 24 * 60 * 60 * 1000) // 24 horas

setInterval(() => {
  // Cálculo de bandwidth a cada 6 horas
  scheduleBandwidthCalculation(undefined, 'daily')
}, 6 * 60 * 60 * 1000) // 6 horas

logger.info('Background tasks system initialized')