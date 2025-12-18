import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, readBody, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

    // Get request body
    const body = await readBody(event)
    const { platform_name } = body

    if (!platform_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nome da plataforma é obrigatório'
      })
    }

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

    // Verificar se a configuração já existe
    const { data: existingSetting } = await supabase
      .from('system_settings')
      .select('id')
      .eq('category', 'platform')
      .eq('key', 'platform_name')
      .single()

    let result
    if (existingSetting) {
      // Atualizar configuração existente
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          value: platform_name,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('category', 'platform')
        .eq('key', 'platform_name')
        .select()
        .single()

      result = { data, error }
    } else {
      // Criar nova configuração
      const { data, error } = await supabase
        .from('system_settings')
        .insert({
          category: 'platform',
          key: 'platform_name',
          value: platform_name,
          description: 'Nome da plataforma exibido na interface',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao salvar configuração: ${result.error.message}`
      })
    }

    return {
      success: true,
      data: {
        platform_name: platform_name
      },
      message: 'Nome da plataforma atualizado com sucesso'
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