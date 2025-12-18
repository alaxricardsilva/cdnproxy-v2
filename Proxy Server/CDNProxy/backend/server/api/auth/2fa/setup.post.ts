import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'

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

    // Check if user exists in users table
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

    // Check if 2FA is already enabled
    if (userData.two_factor_enabled) {
      throw createError({
        statusCode: 400,
        statusMessage: '2FA já está habilitado para este usuário'
      })
    }

    // Generate secret for 2FA
    const secret = speakeasy.generateSecret({
      name: `ProxyCDN (${userData.email})`,
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
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})