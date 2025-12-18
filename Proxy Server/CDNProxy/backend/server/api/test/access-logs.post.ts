import { logger } from '~/utils/logger'
import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getGeolocation } from '../../../utils/geolocation'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { ip, domain = 'gf.proxysrv.top', path = '/', user_agent = 'Test Agent' } = body

    if (!ip) {
      throw createError({
        statusCode: 400,
        statusMessage: 'IP é obrigatório'
      })
    }

    logger.info(`🧪 [TEST ACCESS LOGS] Testando com IP: ${ip}`)

    // Obter dados de geolocalização
    const startTime = Date.now()
    const geoData = await getGeolocation(ip)
    const responseTime = Date.now() - startTime

    logger.info(`🌍 [TEST ACCESS LOGS] Geolocalização obtida:`, {
      country: geoData.country,
      city: geoData.city,
      responseTime: `${responseTime}ms`
    })

    // Inserir no access_logs
    const logData = {
      domain_id: 'test-domain-id',
      client_ip: ip,
      real_ip: ip,
      ip_address: ip,
      path,
      user_agent,
      status_code: 200,
      bytes_transferred: 1024,
      response_time_ms: Math.floor(Math.random() * 500) + 50,
      country: geoData.country,
      city: geoData.city,
      endpoint_type: 'test',
      created_at: new Date().toISOString()
    }

    const { data: insertedLog, error: insertError } = await supabase
      .from('access_logs')
      .insert(logData)
      .select()
      .single()

    if (insertError) {
      logger.error('❌ [TEST ACCESS LOGS] Erro ao inserir:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao inserir log: ${insertError.message}`
      })
    }

    logger.info('✅ [TEST ACCESS LOGS] Log inserido com sucesso:', insertedLog.id)

    return {
      success: true,
      data: {
        log_id: insertedLog.id,
        ip,
        geolocation: {
          country: geoData.country,
          city: geoData.city,
          responseTime: `${responseTime}ms`
        },
        inserted_at: insertedLog.created_at
      },
      message: 'Log de teste inserido com sucesso'
    }

  } catch (error: any) {
    logger.error('💥 [TEST ACCESS LOGS] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno: ${error.message}`
    })
  }
})