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
      .select('id, two_factor_secret, two_factor_enabled, two_factor_backup_codes')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    if (!userData.two_factor_enabled) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA não está habilitado'
      })
    }

    // Check if it's a backup code
    let isValidCode = false
    
    if (userData.two_factor_backup_codes && userData.two_factor_backup_codes.includes(code)) {
      isValidCode = true
    } else if (userData.two_factor_secret) {
      // Verify the TOTP code
      isValidCode = speakeasy.totp.verify({
        secret: userData.two_factor_secret,
        encoding: 'base32',
        token: code,
        window: 2
      })
    }

    if (!isValidCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Código inválido'
      })
    }

    // Disable 2FA and clear all related data
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Erro ao desabilitar 2FA:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao desabilitar 2FA'
      })
    }

    return {
      success: true,
      message: '2FA desabilitado com sucesso'
    }

  } catch (error: any) {
    logger.error('Erro ao desabilitar 2FA superadmin:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})