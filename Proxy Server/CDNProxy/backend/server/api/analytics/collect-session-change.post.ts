import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Ler dados do corpo da requisição
    const sessionData = await readBody(event)
    
    logger.info('🔄 [SESSION-CHANGE] Recebendo dados:', {
      session_id: sessionData.session_id,
      previous_session: sessionData.previous_session_id,
      change_reason: sessionData.change_reason,
      client_ip: sessionData.client_ip
    })

    // Validar dados obrigatórios
    if (!sessionData.session_id || !sessionData.client_ip) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados obrigatórios ausentes: session_id, client_ip'
      })
    }

    // Configurar Supabase
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Inserir dados na tabela access_logs com informações de sessão
    const { data, error } = await supabase
      .from('access_logs')
      .insert({
        domain: sessionData.domain || 'session-change',
        domain_id: sessionData.domain_id,
        path: '/session-change',
        method: 'SESSION',
        status_code: 200,
        client_ip: sessionData.client_ip,
        user_agent: sessionData.user_agent || 'Session Change',
        device_type: sessionData.device_type,
        country: sessionData.country,
        session_id: sessionData.session_id,
        change_type: 'session_change',
        content_id: sessionData.previous_session_id,
        episode_id: sessionData.episode_id,
        bytes_sent: sessionData.bytes_sent || 0,
        response_time_ms: sessionData.response_time_ms || 0,
        access_timestamp: new Date().toISOString()
      })

    if (error) {
      logger.error('❌ [SESSION-CHANGE] Erro ao inserir no Supabase:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao salvar mudança de sessão'
      })
    }

    logger.info('✅ [SESSION-CHANGE] Dados salvos com sucesso')

    return {
      success: true,
      message: 'Mudança de sessão registrada com sucesso',
      data: data
    }

  } catch (error: any) {
    logger.error('❌ [SESSION-CHANGE] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})