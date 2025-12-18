import { logger } from '~/utils/logger'
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  logger.info('🔧 API /api/superadmin/profile PUT iniciada')
  
  try {
    // Verificar autenticação de superadmin
    const { user, userProfile, supabase: supabaseAdmin } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ Autenticação bem-sucedida para usuário:', user.id)

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    logger.info('📝 Dados recebidos:', { 
      hasProfile: !!body.profile,
      hasSecurity: !!body.security,
      hasSecuritySettings: !!body.securitySettings,
      twoFactorEnabled: body.twoFactorEnabled
    })

    const { profile: profileData, security, securitySettings, twoFactorEnabled } = body

    // Atualizar perfil do usuário se fornecido
    if (profileData) {
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .update({
          name: profileData.name,
          whatsapp: profileData.phone, // Campo correto é whatsapp na tabela users
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) {
        logger.error('❌ Erro ao atualizar perfil:', profileError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Erro ao atualizar perfil'
        })
      }
    }

    // Atualizar senha se fornecida
    if (security?.newPassword && security?.currentPassword) {
      // Verificar senha atual
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password: security.currentPassword
      })

      if (signInError) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Senha atual incorreta'
        })
      }

      // Atualizar senha
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: security.newPassword }
      )

      if (updateError) {
        logger.error('❌ Erro ao atualizar senha:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Erro ao atualizar senha'
        })
      }
    }

    // Salvar configurações de segurança se fornecidas
    if (securitySettings) {
      // Verificar se já existe configuração para este usuário
      const { data: existingConfig } = await supabaseAdmin
        .from('admin_security_settings')
        .select('id')
        .eq('admin_id', user.id)
        .single()

      const settingsData = {
        admin_id: user.id,
        require_2fa: securitySettings.require2FA,
        google_auth_enabled: securitySettings.googleAuth,
        multiple_sessions_allowed: securitySettings.multipleSessions,
        min_password_length: securitySettings.minPasswordLength,
        require_special_chars: securitySettings.requireSpecialChars,
        require_numbers: securitySettings.requireNumbers,
        max_login_attempts: securitySettings.loginAttempts,
        api_rate_limit: securitySettings.apiRequests,
        auto_block_enabled: securitySettings.autoBlock,
        two_factor_enabled: twoFactorEnabled,
        updated_at: new Date().toISOString()
      }

      if (existingConfig) {
        // Atualizar configuração existente
        const { error: updateError } = await supabaseAdmin
          .from('admin_security_settings')
          .update(settingsData)
          .eq('admin_id', user.id)

        if (updateError) {
          logger.error('❌ Erro ao atualizar configurações de segurança:', updateError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Erro ao atualizar configurações de segurança'
          })
        }
      } else {
        // Criar nova configuração
        const { error: insertError } = await supabaseAdmin
          .from('admin_security_settings')
          .insert({
            ...settingsData,
            created_at: new Date().toISOString()
          })

        if (insertError) {
          logger.error('❌ Erro ao criar configurações de segurança:', insertError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Erro ao criar configurações de segurança'
          })
        }
      }
    }

    logger.info('✅ Configurações salvas com sucesso')

    return {
      success: true,
      message: 'Configurações salvas com sucesso'
    }

  } catch (error: any) {
    logger.error('❌ Erro na API profile PUT:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor',
      data: { originalError: error.message }
    })
  }
})