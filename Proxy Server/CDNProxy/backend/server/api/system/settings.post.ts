import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, getHeader, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

    // Get request body
    const body = await readBody(event)
    const { category, settings } = body

    // Get user from headers
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Verify JWT token and check superadmin role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Check if user has superadmin privileges
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Apenas superadmins podem alterar configurações'
      })
    }

    // Validate settings
    if (!category || !settings || typeof settings !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Categoria e configurações são obrigatórias'
      })
    }

    const validCategories = ['general', 'security', 'performance', 'monitoring', 'backup', 'email']
    if (!validCategories.includes(category)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Categoria inválida'
      })
    }

    // Update settings
    const updatedSettings = []
    const errors = []

    for (const [key, value] of Object.entries(settings)) {
      try {
        // Check if setting exists
        const { data: existingSetting } = await supabase
          .from('system_settings')
          .select('id')
          .eq('category', category)
          .eq('key', key)
          .single()

        if (existingSetting) {
          // Update existing setting
          const { error: updateError } = await supabase
            .from('system_settings')
            .update({
              value: value,
              updated_at: new Date().toISOString(),
              updated_by: user.id
            })
            .eq('id', existingSetting.id)

          if (updateError) {
            errors.push({ key, error: updateError.message })
          } else {
            updatedSettings.push({ key, value, action: 'updated' })
          }
        } else {
          // Create new setting
          const { error: insertError } = await supabase
            .from('system_settings')
            .insert({
              category,
              key,
              value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: user.id,
              updated_by: user.id
            })

          if (insertError) {
            errors.push({ key, error: insertError.message })
          } else {
            updatedSettings.push({ key, value, action: 'created' })
          }
        }
      } catch (error: any) {
        errors.push({ key, error: error.message })
      }
    }

    // Log settings change
    await supabase
      .from('access_logs')
      .insert({
        user_id: user.id,
        action: 'settings_update',
        details: JSON.stringify({ 
          category, 
          updatedSettings, 
          errors,
          timestamp: new Date().toISOString()
        }),
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent'),
        created_at: new Date().toISOString()
      })

    return {
      success: true,
      data: {
        category,
        updatedSettings,
        errors,
        timestamp: new Date().toISOString()
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

function getClientIP(event: any): string {
  return getHeader(event, 'x-forwarded-for') || 
         getHeader(event, 'x-real-ip') || 
         '127.0.0.1'
}