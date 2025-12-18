import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Obter configuração do runtime
    const config = useRuntimeConfig()

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

    // Verify JWT token and check admin role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Check if user has admin privileges
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['ADMIN', 'SUPERADMIN'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      })
    }

    // Get system settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')

    if (settingsError) {
      // If table doesn't exist, return default settings
      const defaultSettings = {
        general: {
          siteName: 'ProxyCDN',
          siteDescription: 'Sistema de CDN e Proxy',
          maintenanceMode: false,
          registrationEnabled: true,
          emailVerificationRequired: true,
          maxDomainsPerUser: 10,
          defaultPlan: 'free'
        },
        security: {
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          lockoutDuration: 900,
          passwordMinLength: 8,
          requireTwoFactor: false,
          allowedOrigins: ['*']
        },
        performance: {
          cacheEnabled: true,
          cacheTTL: 3600,
          compressionEnabled: true,
          rateLimitEnabled: true,
          maxRequestsPerMinute: 100,
          maxBandwidthPerUser: 1073741824 // 1GB
        },
        monitoring: {
          logsRetentionDays: 30,
          analyticsRetentionDays: 90,
          alertsEnabled: true,
          emailNotifications: true,
          slackWebhook: '',
          discordWebhook: ''
        },
        backup: {
          enabled: true,
          frequency: 'daily',
          retention: 7,
          s3Bucket: '',
          s3Region: 'us-east-1'
        },
        email: {
          provider: 'smtp',
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          fromEmail: 'noreply@ricardtech.top',
          fromName: 'ProxyCDN'
        }
      }

      return {
        success: true,
        data: defaultSettings
      }
    }

    // Process settings into categories
    const processedSettings = {
      general: {},
      security: {},
      performance: {},
      monitoring: {},
      backup: {},
      email: {}
    }

    settings?.forEach((setting: any) => {
      const category = setting.category || 'general'
      if (processedSettings[category as keyof typeof processedSettings]) {
        processedSettings[category as keyof typeof processedSettings][setting.key] = setting.value
      }
    })

    return {
      success: true,
      data: processedSettings
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