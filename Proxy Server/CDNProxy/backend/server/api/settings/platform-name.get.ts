import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

    // Initialize Supabase client
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Buscar configuração do nome da plataforma
    const { data: platformNameSetting, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('category', 'platform')
      .eq('key', 'platform_name')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar configuração'
      })
    }

    // Retornar nome da plataforma ou valor padrão
    const platformName = platformNameSetting?.value || 'CDN Proxy'

    return {
      success: true,
      data: {
        platform_name: platformName
      }
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})