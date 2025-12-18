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

    // Get request body
    const body = await readBody(event)
    const { email, code } = body

    if (!email || !code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email e código de verificação são necessários'
      })
    }

    // Get user data with 2FA secret
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, two_factor_secret, two_factor_enabled, status')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    if (userData.status !== 'active') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Conta inativa'
      })
    }

    if (!userData.two_factor_enabled || !userData.two_factor_secret) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA não está habilitado para este usuário'
      })
    }

    // Verify the TOTP code
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

    // Generate JWT token for the user
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: 'temp_password' // This should be handled differently in production
    })

    return {
      success: true,
      message: '2FA verificado com sucesso',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name
      }
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})