import { logger } from '~/utils/logger'
import { createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    const query = getQuery(event)
    const domain = query.domain as string
    const period = (query.period as string) || '24h'
    const limit = parseInt(query.limit as string) || 20
    
    if (!domain) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Domain ID é obrigatório'
      })
    }

    // Calcular período de tempo baseado no fuso horário de São Paulo
    const now = new Date()
    const saoPauloOffset = -3 * 60 // UTC-3 em minutos
    const localNow = new Date(now.getTime() + (saoPauloOffset * 60 * 1000))
    
    let startDate: Date
    switch (period) {
      case '7d':
        startDate = new Date(localNow.getTime() - (7 * 24 * 60 * 60 * 1000))
        break
      case '30d':
        startDate = new Date(localNow.getTime() - (30 * 24 * 60 * 60 * 1000))
        break
      case '90d':
        startDate = new Date(localNow.getTime() - (90 * 24 * 60 * 60 * 1000))
        break
      default: // 24h
        startDate = new Date(localNow.getTime() - (24 * 60 * 60 * 1000))
        break
    }

    // Buscar dados de access logs para análise de conteúdo
    const { data: accessLogs, error: accessError } = await supabase
      .from('access_logs')
      .select('path, status_code, bytes_transferred, bytes_sent, created_at')
      .eq('domain_id', domain)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', localNow.toISOString())

    if (accessError) {
      logger.error('Erro ao buscar access logs:', accessError)
    }

    const logs = accessLogs || []

    // Agrupar por path e calcular estatísticas
    const contentStats = new Map()

    logs.forEach((log: any) => {
      const path = log.path || '/'
      
      if (!contentStats.has(path)) {
        contentStats.set(path, {
          path,
          requests: 0,
          bytes: 0,
          errors: 0,
          success: 0
        })
      }

      const stats = contentStats.get(path)
      stats.requests++
      stats.bytes += log.bytes_transferred || log.bytes_sent || 0
      
      if (log.status_code >= 400) {
        stats.errors++
      } else {
        stats.success++
      }
    })

    // Converter para array e ordenar por número de requests
    const topContent = Array.from(contentStats.values())
      .sort((a: any, b: any) => b.requests - a.requests)
      .slice(0, limit)
      .map((item: any) => ({
        ...item,
        success_rate: item.requests > 0 ? Math.round((item.success / item.requests) * 100) : 0,
        bytes_formatted: formatBytes(item.bytes)
      }))

    // Estatísticas gerais de conteúdo
    const totalRequests = logs.length
    const totalBytes = logs.reduce((sum: number, log: any) => sum + (log.bytes_transferred || log.bytes_sent || 0), 0)
    const errorRequests = logs.filter((log: any) => log.status_code >= 400).length
    const successRate = totalRequests > 0 ? Math.round(((totalRequests - errorRequests) / totalRequests) * 100) : 0

    return {
      success: true,
      data: {
        top_content: topContent,
        summary: {
          total_requests: totalRequests,
          total_bytes: totalBytes,
          total_bytes_formatted: formatBytes(totalBytes),
          error_requests: errorRequests,
          success_rate: successRate,
          unique_paths: contentStats.size
        }
      },
      period: {
        start: startDate.toISOString(),
        end: localNow.toISOString(),
        period
      },
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    logger.error('Erro no endpoint de content analytics:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Função auxiliar para formatar bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}