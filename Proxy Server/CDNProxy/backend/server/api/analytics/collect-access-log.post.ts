import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { toSaoPauloISOString } from '~/utils/timezone'

// Função para validar UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Schema de validação
const AccessLogSchema = z.object({
  domain: z.string(),
  domain_id: z.union([z.string(), z.number()]).optional(),
  path: z.string(),
  method: z.string(),
  status_code: z.number(),
  client_ip: z.string(),
  user_agent: z.string().nullable().optional(),
  referer: z.string().nullable().optional(),
  device_type: z.string().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  response_time: z.number().optional(),
  content_length: z.number().optional(),
  bytes_transferred: z.number().optional(),
  bytes_sent: z.number().optional(),
  cache_status: z.string().optional(),
  timestamp: z.string().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    console.log('DEBUG - Dados recebidos:', JSON.stringify(body, null, 2))
    
    // Validar dados de entrada
    const validationResult = AccessLogSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('DEBUG - Erro de validação:', validationResult.error)
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados inválidos',
        data: validationResult.error.errors
      })
    }
    
    const validatedData = validationResult.data
    console.log('DEBUG - Dados validados:', JSON.stringify(validatedData, null, 2))
    
    // Configurar Supabase
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl || config.supabaseUrl
    const supabaseKey = config.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('DEBUG - Configuração Supabase:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
      throw createError({
        statusCode: 500,
        statusMessage: 'Configuração do Supabase incompleta'
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Salvar no cache de geolocalização se necessário
    const { data: existingCache } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .eq('ip', validatedData.client_ip)
      .single()

    if (!existingCache) {
      // Buscar geolocalização se não existir
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${validatedData.client_ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp`)
        const geoData = await geoResponse.json()
        
        if (geoData.status === 'success') {
          await supabase
            .from('ip_geo_cache')
            .insert({
              ip: validatedData.client_ip,
              country: geoData.country,
              country_code: geoData.countryCode,
              region: geoData.regionName,
              city: geoData.city,
              latitude: geoData.lat,
              longitude: geoData.lon,
              timezone: geoData.timezone,
              isp: geoData.isp
            })
        }
      } catch (geoError) {
        console.error('Erro ao buscar geolocalização:', geoError)
      }
    }

    // Preparar dados para inserção
    const insertData = {
      domain: validatedData.domain,
      domain_id: validatedData.domain_id && isValidUUID(String(validatedData.domain_id)) ? String(validatedData.domain_id) : null,
      path: validatedData.path,
      method: validatedData.method,
      status_code: validatedData.status_code,
      client_ip: validatedData.client_ip,
      user_agent: validatedData.user_agent,
      referer: validatedData.referer,
      device_type: validatedData.device_type,
      country: validatedData.country,
      city: validatedData.city,
      response_time: validatedData.response_time,
      bytes_transferred: validatedData.bytes_transferred || validatedData.content_length || 0,
      bytes_sent: validatedData.bytes_sent || validatedData.bytes_transferred || validatedData.content_length || 0,
      cache_status: validatedData.cache_status,
      access_timestamp: validatedData.timestamp || toSaoPauloISOString()
    }
    
    console.log('DEBUG - Dados para inserção:', JSON.stringify(insertData, null, 2))

    // Salvar log de acesso
    const { data: insertResult, error: logError } = await supabase
      .from('access_logs')
      .insert(insertData)
      .select()

    if (logError) {
      console.error('DEBUG - Erro do Supabase:', JSON.stringify(logError, null, 2))
      console.error('DEBUG - Dados que causaram erro:', JSON.stringify(insertData, null, 2))
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao salvar log de acesso'
      })
    }

    console.log('DEBUG - Inserção bem-sucedida:', insertResult)

    return {
      success: true,
      message: 'Log de acesso registrado com sucesso',
      ip: validatedData.client_ip
    }

  } catch (error) {
    console.error('Erro na API collect-access-log:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})