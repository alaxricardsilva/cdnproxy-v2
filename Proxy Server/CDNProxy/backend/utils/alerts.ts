import { logger } from './logger'

interface AlertRule {
  id: string
  name: string
  condition: (metrics: any) => boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  cooldown: number // em minutos
  enabled: boolean
}

interface Alert {
  id: string
  ruleId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
  resolvedAt?: string
  metadata?: Record<string, any>
}

class AlertManager {
  private alerts: Alert[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private rules: AlertRule[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    this.rules = [
      {
        id: 'api-health-critical',
        name: 'APIs Críticas Indisponíveis',
        condition: (metrics) => {
          const criticalAPIs = metrics.criticalAPIs?.summary
          return criticalAPIs && criticalAPIs.unhealthy > 0
        },
        severity: 'critical',
        message: 'Uma ou mais APIs críticas estão indisponíveis',
        cooldown: 5, // 5 minutos
        enabled: true
      },
      {
        id: 'api-health-warning',
        name: 'APIs com Problemas de Autenticação',
        condition: (metrics) => {
          const criticalAPIs = metrics.criticalAPIs?.summary
          return criticalAPIs && criticalAPIs.warning > 2
        },
        severity: 'medium',
        message: 'Múltiplas APIs apresentando problemas de autenticação',
        cooldown: 10, // 10 minutos
        enabled: true
      },
      {
        id: 'database-unhealthy',
        name: 'Database Indisponível',
        condition: (metrics) => {
          return metrics.services?.database?.healthy === false
        },
        severity: 'critical',
        message: 'Database está indisponível',
        cooldown: 2, // 2 minutos
        enabled: true
      },
      {
        id: 'high-response-time',
        name: 'Tempo de Resposta Alto',
        condition: (metrics) => {
          const dbResponseTime = metrics.services?.database?.responseTime
          return dbResponseTime && dbResponseTime > 5000 // 5 segundos
        },
        severity: 'medium',
        message: 'Tempo de resposta do database está alto',
        cooldown: 15, // 15 minutos
        enabled: true
      },
      {
        id: 'memory-usage-high',
        name: 'Uso de Memória Alto',
        condition: (metrics) => {
          const memoryUsage = metrics.system?.memory?.usage
          if (memoryUsage && typeof memoryUsage === 'string') {
            const usage = parseFloat(memoryUsage.replace('%', ''))
            return usage > 85 // 85%
          }
          return false
        },
        severity: 'high',
        message: 'Uso de memória está acima de 85%',
        cooldown: 20, // 20 minutos
        enabled: true
      },
      {
        id: 'backend-service-down',
        name: 'Serviço Backend Indisponível',
        condition: (metrics) => {
          return metrics.services?.backend?.healthy === false
        },
        severity: 'critical',
        message: 'Serviço backend está indisponível',
        cooldown: 1, // 1 minuto
        enabled: true
      }
    ]
  }

  checkAlerts(metrics: any): Alert[] {
    const newAlerts: Alert[] = []
    const now = Date.now()

    for (const rule of this.rules) {
      if (!rule.enabled) continue

      try {
        const shouldAlert = rule.condition(metrics)
        
        if (shouldAlert) {
          const lastAlert = this.lastAlertTime.get(rule.id) || 0
          const cooldownMs = rule.cooldown * 60 * 1000
          
          // Verificar se está no período de cooldown
          if (now - lastAlert < cooldownMs) {
            continue
          }

          const alert: Alert = {
            id: `${rule.id}-${now}`,
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.message,
            timestamp: new Date().toISOString(),
            resolved: false,
            metadata: {
              ruleName: rule.name,
              metrics: this.extractRelevantMetrics(rule.id, metrics)
            }
          }

          newAlerts.push(alert)
          this.alerts.push(alert)
          this.lastAlertTime.set(rule.id, now)

          // Log do alerta
          logger.warn(`ALERT: ${rule.name}`, {
            alertId: alert.id,
            severity: rule.severity,
            message: rule.message,
            metadata: alert.metadata
          })

          // Para alertas críticos, também fazer log como erro
          if (rule.severity === 'critical') {
            logger.error(`CRITICAL ALERT: ${rule.name}`, undefined, {
              alertId: alert.id,
              message: rule.message,
              metadata: alert.metadata
            })
          }
        }
      } catch (error) {
        logger.error(`Error checking alert rule ${rule.id}`, error instanceof Error ? error : new Error(String(error)))
      }
    }

    return newAlerts
  }

  private extractRelevantMetrics(ruleId: string, metrics: any): Record<string, any> {
    switch (ruleId) {
      case 'api-health-critical':
      case 'api-health-warning':
        return {
          criticalAPIs: metrics.criticalAPIs,
          overallStatus: metrics.overallStatus
        }
      case 'database-unhealthy':
      case 'high-response-time':
        return {
          database: metrics.services?.database,
          timestamp: metrics.timestamp
        }
      case 'memory-usage-high':
        return {
          memory: metrics.system?.memory,
          timestamp: metrics.timestamp
        }
      case 'backend-service-down':
        return {
          backend: metrics.services?.backend,
          timestamp: metrics.timestamp
        }
      default:
        return { timestamp: metrics.timestamp }
    }
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId && !a.resolved)
    
    if (alert) {
      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()
      
      logger.info(`Alert resolved: ${alert.message}`, {
        alertId: alert.id,
        resolvedAt: alert.resolvedAt
      })
      
      return true
    }
    
    return false
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  getAllAlerts(limit: number = 50): Alert[] {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  getAlertsByRule(ruleId: string): Alert[] {
    return this.alerts.filter(alert => alert.ruleId === ruleId)
  }

  addCustomRule(rule: AlertRule): void {
    this.rules.push(rule)
    logger.info(`Custom alert rule added: ${rule.name}`, { ruleId: rule.id })
  }

  disableRule(ruleId: string): boolean {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = false
      logger.info(`Alert rule disabled: ${rule.name}`, { ruleId })
      return true
    }
    return false
  }

  enableRule(ruleId: string): boolean {
    const rule = this.rules.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = true
      logger.info(`Alert rule enabled: ${rule.name}`, { ruleId })
      return true
    }
    return false
  }

  getRules(): AlertRule[] {
    return [...this.rules]
  }

  // Método para auto-resolução de alertas baseado em métricas atuais
  autoResolveAlerts(metrics: any): Alert[] {
    const resolvedAlerts: Alert[] = []
    const activeAlerts = this.getActiveAlerts()

    for (const alert of activeAlerts) {
      const rule = this.rules.find(r => r.id === alert.ruleId)
      
      if (rule && rule.enabled) {
        try {
          const stillTriggered = rule.condition(metrics)
          
          if (!stillTriggered) {
            alert.resolved = true
            alert.resolvedAt = new Date().toISOString()
            resolvedAlerts.push(alert)
            
            logger.info(`Alert auto-resolved: ${alert.message}`, {
              alertId: alert.id,
              resolvedAt: alert.resolvedAt,
              autoResolved: true
            })
          }
        } catch (error) {
          logger.error(`Error auto-resolving alert ${alert.id}`, error instanceof Error ? error : new Error(String(error)))
        }
      }
    }

    return resolvedAlerts
  }
}

// Instância global do gerenciador de alertas
export const alertManager = new AlertManager()

export type { AlertRule, Alert }
export default alertManager