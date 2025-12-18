import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireUserAuth } from '../../../../utils/hybrid-auth'
import * as speakeasy from 'speakeasy'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação do usuário
    const { user, supabase } = await requireUserAuth(event)

    // Get request body
    const body = await readBody(event)
    const { code } = body

    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Código de verificação necessário'
      })
    }

    // Get user data with 2FA secret
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, two_factor_secret, two_factor_enabled')
      .eq('email', user.email)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    if (!userData.two_factor_secret) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA não foi configurado. Execute o setup primeiro.'
      })
    }

    if (userData.two_factor_enabled) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA já está habilitado'
      })
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret: userData.two_factor_secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps before/after current time
    })

    if (!verified) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Código de verificação inválido'
      })
    }

    // Enable 2FA for the user
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        two_factor_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao ativar 2FA'
      })
    }

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase())
    }

    // Store backup codes
    const { error: backupError } = await supabase
      .from('users')
      .update({ 
        two_factor_backup_codes: backupCodes,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (backupError) {
      logger.error('Erro ao salvar códigos de backup:', backupError)
    }

    return {
      success: true,
      data: {
        backupCodes: backupCodes
      },
      message: '2FA ativado com sucesso!'
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})