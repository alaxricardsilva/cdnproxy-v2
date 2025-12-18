import { logger } from '~/utils/logger'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação usando o sistema híbrido melhorado
    const { user, userProfile, supabase } = await requireAdminAuth(event)

    const query = getQuery(event)
    const action = query.action as string
    const alertId = query.alertId as string
    const ruleId = query.ruleId as string
    const limit = parseInt(query.limit as string) || 50

    logger.info('Alerts API accessed', {
      userId: user.id,
      action,
      alertId,
      ruleId
    })

    // Buscar alertas reais do banco de dados
    switch (action) {
      case 'resolve':
        if (!alertId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Alert ID é obrigatório para resolver alerta'
          })
        }
        
        // Atualizar alerta no banco de dados
        const { error: resolveError } = await supabase
          .from('system_alerts')
          .update({ 
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: user.id
          })
          .eq('id', alertId)

        if (resolveError) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Alerta não encontrado ou já resolvido'
          })
        }

        logger.info('Alert manually resolved', {
          userId: user.id,
          alertId,
          resolvedBy: user.email
        })

        return {
          success: true,
          message: 'Alerta resolvido com sucesso',
          alertId
        }

      case 'disable-rule':
        if (!ruleId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Rule ID é obrigatório para desabilitar regra'
          })
        }

        // Desabilitar regra no banco de dados
        const { error: disableError } = await supabase
          .from('alert_rules')
          .update({ 
            enabled: false,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('id', ruleId)

        if (disableError) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Regra não encontrada'
          })
        }

        console.warn('Alert rule disabled', {
          userId: user.id,
          ruleId,
          disabledBy: user.email
        })

        return {
          success: true,
          message: 'Regra de alerta desabilitada',
          ruleId
        }

      case 'enable-rule':
        if (!ruleId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Rule ID é obrigatório para habilitar regra'
          })
        }

        // Habilitar regra no banco de dados
        const { error: enableError } = await supabase
          .from('alert_rules')
          .update({ 
            enabled: true,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('id', ruleId)

        if (enableError) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Regra não encontrada'
          })
        }

        logger.info('Alert rule enabled', {
          userId: user.id,
          ruleId,
          enabledBy: user.email
        })

        return {
          success: true,
          message: 'Regra de alerta habilitada',
          ruleId
        }

      case 'rules':
        // Buscar regras de alerta do banco de dados
        const { data: alertRules, error: rulesError } = await supabase
          .from('alert_rules')
          .select('*')
          .order('created_at', { ascending: false })

        if (rulesError) {
          logger.error('Erro ao buscar regras de alerta:', rulesError)
          return {
            success: false,
            error: 'Erro ao buscar regras de alerta',
            data: {
              rules: [],
              timestamp: new Date().toISOString()
            }
          }
        }

        return {
          success: true,
          data: {
            rules: alertRules || [],
            timestamp: new Date().toISOString()
          }
        }

      case 'active':
        // Buscar alertas ativos do banco de dados
        const { data: activeSystemAlerts, error: activeError } = await supabase
          .from('system_alerts')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (activeError) {
          logger.error('Erro ao buscar alertas ativos:', activeError)
          return {
            success: true,
            data: {
              alerts: [],
              count: 0,
              timestamp: new Date().toISOString()
            }
          }
        }

        return {
          success: true,
          data: {
            alerts: activeSystemAlerts || [],
            count: activeSystemAlerts?.length || 0,
            timestamp: new Date().toISOString()
          }
        }

      case 'history':
        // Buscar histórico de alertas do banco de dados
        const { data: historySystemAlerts, error: historyError } = await supabase
          .from('system_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (historyError) {
          logger.error('Erro ao buscar histórico de alertas:', historyError)
          return {
            success: true,
            data: {
              alerts: [],
              limit,
              timestamp: new Date().toISOString()
            }
          }
        }

        return {
          success: true,
          data: {
            alerts: historySystemAlerts || [],
            limit,
            timestamp: new Date().toISOString()
          }
        }

      case 'by-rule':
        if (!ruleId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Rule ID é obrigatório'
          })
        }

        // Buscar alertas por regra específica
        const { data: ruleSystemAlerts, error: ruleError } = await supabase
          .from('system_alerts')
          .select('*')
          .eq('rule_id', ruleId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (ruleError) {
          return {
            success: true,
            data: {
              alerts: [],
              ruleId,
              timestamp: new Date().toISOString()
            }
          }
        }

        return {
          success: true,
          data: {
            alerts: ruleSystemAlerts || [],
            ruleId,
            timestamp: new Date().toISOString()
          }
        }

      default:
        // Retornar resumo geral dos alertas
        const { data: allActiveAlerts } = await supabase
          .from('system_alerts')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        const { data: allRules } = await supabase
          .from('alert_rules')
          .select('*')
          .eq('enabled', true)

        return {
          success: true,
          data: {
            summary: {
              activeAlerts: allActiveAlerts?.length || 0,
              enabledRules: allRules?.length || 4,
              lastUpdate: new Date().toISOString()
            },
            recentAlerts: allActiveAlerts?.slice(0, 5) || [],
            timestamp: new Date().toISOString()
          }
        }
    }

  } catch (error: any) {
    logger.error('Erro na API de alertas:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})