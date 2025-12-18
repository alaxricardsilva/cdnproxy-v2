import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import * as speakeasy from 'speakeasy'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    )

    // Get JWT token from Authorization header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autorização necessário'
      })
    }

    const token = authHeader.substring(7)
    
    // Verify JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Get request body
    const body = await readBody(event)
    const { code } = body

    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Código de verificação necessário para desabilitar 2FA'
      })
    }

    // Get user data with 2FA secret
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, two_factor_secret, two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    if (!userData.two_factor_enabled || !userData.two_factor_secret) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA não está habilitado'
      })
    }

    // Verify the TOTP code before disabling
    const verified = speakeasy.totp.verify({
      secret: userData.two_factor_secret,
      encoding: 'base32',
      token: code,
      window: 2
    })

    if (!verified) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Código de verificação inválido'
      })
    }

    // Disable 2FA for the user
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        two_factor_enabled: false,
        two_factor_secret: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao desabilitar 2FA'
      })
    }

    return {
      success: true,
      message: '2FA desabilitado com sucesso!'
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})