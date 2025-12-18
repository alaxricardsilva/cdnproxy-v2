import { logger } from '~/utils/logger'
import { requireUserAuth } from '../../../utils/hybrid-auth'
import { createError } from 'h3'
import { formatSaoPauloDate } from '../../../utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação usando o sistema híbrido melhorado
    const { user, userProfile, supabase } = await requireUserAuth(event)

    // Parâmetros de consulta
    const query = getQuery(event)
    const limit = parseInt(query.limit as string) || 50
    const level = query.level as string
    const startDate = query.start_date as string
    const endDate = query.end_date as string

    // Buscar logs reais de acesso (access_logs) como base para security logs
    let logsQuery = supabase
      .from('access_logs')
      .select(`
        id,
        created_at,
        ip_address,
        real_ip,
        client_ip,
        user_agent,
        status_code,
        request_method,
        path,
        user_id,
        domain_id,
        domains!inner(name, target_url),
        users(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filtros opcionais
    if (startDate) {
      logsQuery = logsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      logsQuery = logsQuery.lte('created_at', endDate)
    }

    const { data: accessLogs, error: logsError } = await logsQuery

    if (logsError) {
      logger.error('Erro ao buscar access_logs:', logsError)
      return {
        success: false,
        error: 'Erro ao buscar logs de segurança',
        data: {
          logs: [],
          stats: {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            warning_requests: 0,
            success_rate: '0.00'
          },
          total: 0,
          filtered: false
        }
      }
    }

    // Transformar access_logs em security logs
    const securityLogs = accessLogs?.map((log: any) => {
      // Determinar o IP real (prioridade: real_ip > client_ip > ip_address)
      const realIp = log.real_ip || log.client_ip || log.ip_address || 'unknown'
      
      // Formatar timestamp para fuso horário de São Paulo
      const formattedTimestamp = formatSaoPauloDate(new Date(log.created_at), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      
      return {
        id: log.id,
        timestamp: log.created_at, // Manter ISO para ordenação
        timestampFormatted: formattedTimestamp, // Adicionar versão formatada
        level: determineLogLevel(log.status_code),
        event: determineEventType(log.request_method, log.status_code),
        user: log.users?.name || log.users?.email || (log.user_id ? `User ${log.user_id.substring(0, 8)}` : 'anonymous'),
        ip: realIp,
        details: {
          method: log.request_method,
          url: log.path,
          status_code: log.status_code,
          user_agent: log.user_agent,
          domain: log.domains?.[0]?.name || 'unknown',
          target_url: log.domains?.[0]?.target_url,
          original_ip: log.ip_address,
          real_ip: log.real_ip,
          client_ip: log.client_ip
        }
      }
    }) || []

    // Buscar estatísticas de segurança
    const { data: statsData } = await supabase
      .from('access_logs')
      .select('status_code, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const stats = calculateSecurityStats(statsData || [])

    return {
      success: true,
      data: {
        logs: securityLogs,
        stats,
        total: securityLogs.length,
        filtered: !!level || !!startDate || !!endDate
      }
    }

  } catch (error: any) {
    logger.error('Erro ao buscar logs de segurança:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Funções auxiliares
function determineLogLevel(statusCode: number): string {
  if (statusCode >= 500) return 'error'
  if (statusCode >= 400) return 'warning'
  if (statusCode >= 300) return 'info'
  return 'success'
}

function determineEventType(method: string, statusCode: number): string {
  if (statusCode === 401) return 'Tentativa de acesso não autorizado'
  if (statusCode === 403) return 'Acesso negado'
  if (statusCode >= 500) return 'Erro interno do servidor'
  if (statusCode >= 400) return 'Requisição inválida'
  if (method === 'POST') return 'Dados enviados'
  if (method === 'GET') return 'Acesso realizado'
  return `Operação ${method}`
}

function calculateSecurityStats(logs: any[]) {
  const total = logs.length
  const successful = logs.filter(log => log.status_code < 400).length
  const failed = logs.filter(log => log.status_code >= 400).length
  const warnings = logs.filter(log => log.status_code >= 400 && log.status_code < 500).length
  
  return {
    total_requests: total,
    successful_requests: successful,
    failed_requests: failed,
    warning_requests: warnings,
    success_rate: total > 0 ? ((successful / total) * 100).toFixed(2) : '0.00'
  }
}