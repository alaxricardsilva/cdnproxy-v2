interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  service: string
  message: string
  metadata?: Record<string, any>
  userId?: string
  requestId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  responseTime?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
}

import { toSaoPauloISOString } from './timezone'

class Logger {
  private serviceName: string

  constructor(serviceName: string = 'ProxyCDN-Backend') {
    this.serviceName = serviceName
  }

  private formatLog(entry: LogEntry): string {
    try {
      const logObject = {
        ...entry,
        service: this.serviceName,
        timestamp: new Date().toISOString()
      }
      
      // Truncar metadata se for muito grande
      if (logObject.metadata) {
        const metadataStr = JSON.stringify(logObject.metadata)
        if (metadataStr.length > 10000) {
          logObject.metadata = { 
            ...logObject.metadata,
            _truncated: true,
            _originalSize: metadataStr.length 
          }
          // Remover propriedades grandes
          for (const key in logObject.metadata) {
            if (typeof logObject.metadata[key] === 'string' && logObject.metadata[key].length > 1000) {
              logObject.metadata[key] = logObject.metadata[key].substring(0, 1000) + '...[truncated]'
            }
          }
        }
      }
      
      // Truncar message se for muito longa
      if (logObject.message && logObject.message.length > 5000) {
        logObject.message = logObject.message.substring(0, 5000) + '...[truncated]'
      }
      
      const result = JSON.stringify(logObject)
      
      // Verificar se o resultado final não é muito grande
      if (result.length > 50000) {
        return JSON.stringify({
          timestamp: logObject.timestamp,
          level: logObject.level,
          service: logObject.service,
          message: 'Log truncated due to size limit',
          originalSize: result.length
        })
      }
      
      return result
    } catch (error) {
      // Fallback em caso de erro
      return JSON.stringify({
        timestamp: toSaoPauloISOString(new Date()),
        level: 'error',
        service: this.serviceName,
        message: 'Error formatting log entry',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  info(message: string, metadata?: Record<string, any>, requestContext?: {
    userId?: string
    requestId?: string
    endpoint?: string
    method?: string
  }) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: this.serviceName,
      message,
      metadata,
      ...requestContext
    }
    
    console.info(this.formatLog(logEntry))
  }

  warn(message: string, metadata?: Record<string, any>, requestContext?: {
    userId?: string
    requestId?: string
    endpoint?: string
    method?: string
  }) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      service: this.serviceName,
      message,
      metadata,
      ...requestContext
    }
    
    console.warn(this.formatLog(logEntry))
  }

  error(message: string, error?: Error, metadata?: Record<string, any>, requestContext?: {
    userId?: string
    requestId?: string
    endpoint?: string
    method?: string
    statusCode?: number
  }) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      service: this.serviceName,
      message,
      metadata,
      ...requestContext,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }
    
    console.error(this.formatLog(logEntry))
  }

  debug(message: string, metadata?: Record<string, any>, requestContext?: {
    userId?: string
    requestId?: string
    endpoint?: string
    method?: string
  }) {
    // Only log debug messages in development
    if (process.env.NODE_ENV === 'development') {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        service: this.serviceName,
        message,
        metadata,
        ...requestContext
      }
      
      console.debug(this.formatLog(logEntry))
    }
  }

  // Método específico para logs de API
  apiRequest(endpoint: string, method: string, statusCode: number, responseTime: number, userId?: string, requestId?: string, metadata?: Record<string, any>) {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info'
    const message = `API ${method} ${endpoint} - ${statusCode} (${responseTime}ms)`
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      endpoint,
      method,
      statusCode,
      responseTime,
      userId,
      requestId,
      metadata
    }
    
    if (level === 'error') {
      console.error(this.formatLog(logEntry))
    } else if (level === 'warn') {
      console.warn(this.formatLog(logEntry))
    } else {
      console.info(this.formatLog(logEntry))
    }
  }

  // Método específico para logs de autenticação
  auth(action: string, success: boolean, userId?: string, email?: string, metadata?: Record<string, any>) {
    const level = success ? 'info' : 'warn'
    const message = `Auth ${action}: ${success ? 'SUCCESS' : 'FAILED'}`
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      userId,
      metadata: {
        ...metadata,
        email,
        action,
        success
      }
    }
    
    if (level === 'warn') {
      console.warn(this.formatLog(logEntry))
    } else {
      logger.info(this.formatLog(logEntry))
    }
  }

  // Método específico para logs de database
  database(operation: string, table: string, success: boolean, responseTime?: number, error?: Error, metadata?: Record<string, any>) {
    const level = success ? 'info' : 'error'
    const message = `DB ${operation} on ${table}: ${success ? 'SUCCESS' : 'FAILED'}`
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      responseTime,
      metadata: {
        ...metadata,
        operation,
        table,
        success
      },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }
    
    if (level === 'error') {
      logger.error(this.formatLog(logEntry))
    } else {
      logger.info(this.formatLog(logEntry))
    }
  }
}

// Instância global do logger
export const logger = new Logger('ProxyCDN-Backend')

// Middleware para logging automático de requests
export function createRequestLogger() {
  return (event: any) => {
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(7)
    const endpoint = event.node.req.url
    const method = event.node.req.method
    
    // Log do início da request
    logger.debug(`Request started: ${method} ${endpoint}`, {
      requestId,
      userAgent: event.node.req.headers['user-agent'],
      ip: event.node.req.headers['x-forwarded-for'] || event.node.req.connection?.remoteAddress
    })
    
    // Adicionar requestId ao contexto
    event.context.requestId = requestId
    event.context.startTime = startTime
    
    return requestId
  }
}

// Função para log do final da request
export function logRequestEnd(event: any, statusCode: number, userId?: string, error?: Error) {
  const responseTime = Date.now() - (event.context.startTime || Date.now())
  const requestId = event.context.requestId
  const endpoint = event.node.req.url
  const method = event.node.req.method
  
  if (error) {
    logger.error(`Request failed: ${method} ${endpoint}`, error, {
      requestId,
      statusCode,
      responseTime
    }, {
      userId,
      requestId,
      endpoint,
      method,
      statusCode
    })
  } else {
    logger.apiRequest(endpoint, method, statusCode, responseTime, userId, requestId)
  }
}

export default logger