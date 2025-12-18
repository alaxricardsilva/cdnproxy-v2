import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate superadmin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Check if 2FA is enabled
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, two_factor_enabled')
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

    // Generate new backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase())
    }

    // Update backup codes in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_backup_codes: backupCodes,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Erro ao gerar novos códigos de backup:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao gerar novos códigos de backup'
      })
    }

    return {
      success: true,
      data: {
        backupCodes: backupCodes
      },
      message: 'Novos códigos de backup gerados com sucesso'
    }

  } catch (error: any) {
    logger.error('Erro ao gerar códigos de backup 2FA:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})