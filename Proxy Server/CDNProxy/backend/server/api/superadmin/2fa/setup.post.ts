import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate superadmin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Check if 2FA is already enabled
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    if (userData.two_factor_enabled) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA já está habilitado para este usuário'
      })
    }

    // Generate secret for 2FA
    const secret = speakeasy.generateSecret({
      name: `ProxyCDN SuperAdmin (${userData.email})`,
      issuer: 'ProxyCDN',
      length: 32
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Store the temporary secret (not yet confirmed)
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        two_factor_secret: secret.base32,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Erro ao armazenar secret 2FA:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao configurar 2FA'
      })
    }

    return {
      success: true,
      data: {
        qrCodeUrl: qrCodeUrl,
        manualCode: secret.base32
      },
      message: 'QR Code gerado. Escaneie com seu aplicativo autenticador e confirme com um código.'
    }

  } catch (error: any) {
    logger.error('Erro no setup 2FA superadmin:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})