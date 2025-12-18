import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Ler dados do corpo da requisição
    const episodeData = await readBody(event)
    
    logger.info('📺 [EPISODE-METRICS] Recebendo dados:', {
      domain: episodeData.domain,
      episode_id: episodeData.episode_id,
      session_id: episodeData.session_id,
      change_type: episodeData.change_type
    })

    // Validar dados obrigatórios
    if (!episodeData.domain || !episodeData.episode_id || !episodeData.session_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados obrigatórios ausentes: domain, episode_id, session_id'
      })
    }

    // Configurar Supabase
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Gerar stream_id se não fornecido (obrigatório na tabela)
    const streamId = episodeData.stream_id || `stream_${episodeData.session_id}_${Date.now()}`

    // Validar domain_id - deve ser UUID válido ou null
    const isValidUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      return uuidRegex.test(str)
    }

    const domainId = episodeData.domain_id && isValidUUID(episodeData.domain_id) 
      ? episodeData.domain_id 
      : null

    // Inserir dados na tabela streaming_metrics
    const { data, error } = await supabase
      .from('streaming_metrics')
      .insert({
        stream_id: streamId,
        domain: episodeData.domain,
        domain_id: domainId,
        session_id: episodeData.session_id,
        episode_id: episodeData.episode_id,
        change_type: episodeData.change_type,
        content_id: episodeData.content_id,
        client_ip: episodeData.client_ip,
        device_type: episodeData.device_type,
        country: episodeData.country,
        user_agent: episodeData.user_agent,
        bytes_transferred: episodeData.bytes_transferred || 0,
        duration_seconds: episodeData.duration_seconds || 0,
        quality: episodeData.quality,
        bitrate: episodeData.bitrate,
        resolution: episodeData.resolution,
        fps: episodeData.fps,
        buffer_health: episodeData.buffer_health,
        latency: episodeData.latency,
        packet_loss: episodeData.packet_loss
      })

    if (error) {
      logger.error('❌ [EPISODE-METRICS] Erro ao inserir no Supabase:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao salvar métricas de episódio'
      })
    }

    logger.info('✅ [EPISODE-METRICS] Dados salvos com sucesso')

    return {
      success: true,
      message: 'Métricas de episódio coletadas com sucesso',
      data: data
    }

  } catch (error: any) {
    logger.error('❌ [EPISODE-METRICS] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})