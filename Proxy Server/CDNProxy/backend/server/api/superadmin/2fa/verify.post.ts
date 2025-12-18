import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'
import * as speakeasy from 'speakeasy'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate superadmin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Get request body
    const body = await readBody(event)
    const { code } = body

    if (!code || code.length !== 6) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Código de 6 dígitos é obrigatório'
      })
    }

    // Get user data with 2FA secret
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, two_factor_secret, two_factor_enabled')
      .eq('id', user.id)
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
        statusMessage: 'Setup 2FA não foi iniciado'
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
        statusMessage: 'Código inválido'
      })
    }

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase())
    }

    // Enable 2FA and save backup codes
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_backup_codes: backupCodes,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Erro ao ativar 2FA:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao ativar 2FA'
      })
    }

    return {
      success: true,
      data: {
        backupCodes: backupCodes
      },
      message: '2FA ativado com sucesso'
    }

  } catch (error: any) {
    logger.error('Erro na verificação 2FA superadmin:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})