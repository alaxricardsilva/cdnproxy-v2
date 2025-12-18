import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { supabaseAdmin } from '../../../utils/hybrid-auth'
import { formatSaoPauloDate } from '../../../utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Usar supabaseAdmin diretamente (temporário para teste)
    const supabase = supabaseAdmin
    
    const query = getQuery(event)
    const level = query.level as string || 'all'
    const limit = parseInt(query.limit as string) || 50
    const offset = parseInt(query.offset as string) || 0

    // Usar o supabase client diretamente
    const logs = await getSecurityLogs(supabase, level, limit, offset)

    return {
      success: true,
      data: logs.data,
      pagination: {
        total: logs.total,
        limit,
        offset,
        hasMore: logs.total > (offset + limit)
      }
    }

  } catch (error: any) {
    logger.error('Erro na API de security-logs:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

async function getSecurityLogs(supabase: any, level: string, limit: number, offset: number) {
  try {
    logger.info('🔍 [SECURITY-LOGS] Buscando logs de segurança reais...')

    // Buscar logs de acesso reais das últimas 24 horas
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    let query = supabase
      .from('access_logs')
      .select(`
        id,
        ip_address,
        real_ip,
        client_ip,
        request_method,
        path,
        status_code,
        user_agent,
        created_at,
        domain,
        user_id,
        users(name, email)
      `, { count: 'exact' })
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })

    // Aplicar filtro de nível se especificado
    if (level !== 'all') {
      if (level === 'critical') {
        query = query.gte('status_code', 500)
      } else if (level === 'warning') {
        query = query.gte('status_code', 400).lt('status_code', 500)
      } else if (level === 'info') {
        query = query.lt('status_code', 400)
      }
    }

    const { data: accessLogs, error: accessLogsError, count } = await query
      .range(offset, offset + limit - 1)

    if (accessLogsError) {
      logger.error('Erro ao buscar access_logs:', accessLogsError)
      throw accessLogsError
    }

    logger.info(`📊 [SECURITY-LOGS] Encontrados ${accessLogs?.length || 0} logs de acesso`)

    // Converter access_logs para formato de security logs
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
         event: determineEventType(log.request_method, log.status_code, log.path),
         user: log.users?.name || log.users?.email || (log.user_id ? `Usuário ${log.user_id.substring(0, 8)}` : 'Visitante'),
         ip: realIp,
         details: {
           method: log.request_method,
           url: log.path,
           status_code: log.status_code,
           user_agent: log.user_agent,
           domain: log.domain || 'unknown',
           original_ip: log.ip_address,
           real_ip: log.real_ip,
           client_ip: log.client_ip
         }
       }
     }) || []

    return {
      data: securityLogs,
      total: count || 0
    }

  } catch (error) {
    logger.error('Erro ao buscar logs de segurança:', error)
    
    // Retornar logs mínimos em caso de erro
    return {
      data: [{
        id: 'error_1',
        timestamp: new Date().toISOString(),
        timestampFormatted: formatSaoPauloDate(new Date()),
        level: 'critical',
        event: 'Erro do sistema',
        user: 'Sistema',
        ip: 'localhost',
        details: 'Erro ao carregar logs de segurança'
      }],
      total: 1
    }
  }
}

// Função para determinar o nível do log baseado no status code
function determineLogLevel(statusCode: number): string {
  if (statusCode >= 500) return 'critical'
  if (statusCode >= 400) return 'warning'
  return 'info'
}

// Função para determinar o tipo de evento
function determineEventType(method: string, statusCode: number, url: string): string {
  if (statusCode >= 500) {
    return 'Erro interno do servidor'
  }
  if (statusCode >= 400) {
    if (statusCode === 401) return 'Acesso não autorizado'
    if (statusCode === 403) return 'Acesso proibido'
    if (statusCode === 404) return 'Recurso não encontrado'
    return 'Erro do cliente'
  }
  if (method === 'POST') return 'Requisição POST'
  if (method === 'PUT') return 'Requisição PUT'
  if (method === 'DELETE') return 'Requisição DELETE'
  return 'Acesso ao recurso'
}