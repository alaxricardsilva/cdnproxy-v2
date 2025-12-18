import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  logger.info('🔧 API /api/superadmin/profile GET iniciada')
  
  try {
    // Verificar autenticação de superadmin
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ Autenticação bem-sucedida para usuário:', user.id)

    // Buscar dados completos do perfil
    let profileQuery = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        status,
        company,
        whatsapp,
        created_at,
        updated_at,
        two_factor_enabled
      `)

    // Only filter by id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      profileQuery = profileQuery.eq('id', user.id)
    } else if (user.id === 'admin') {
      // Para o usuário admin, buscar o perfil do banco de dados ou criar um se não existir
      const { data: adminProfile, error: adminError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@cdnproxy.top')
        .single()
      
      if (adminError || !adminProfile) {
        // Se não existir, criar um perfil de admin no banco de dados
        const { data: newAdminProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: 'admin',
            name: 'Administrador',
            email: 'admin@cdnproxy.top',
            role: 'SUPERADMIN',
            status: 'active',
            company: 'CDN Proxy',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (createError) {
          logger.error('Erro ao criar perfil de admin:', createError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Erro ao criar perfil de administrador'
          })
        }
        
        return {
          success: true,
          data: {
            profile: newAdminProfile,
            security_settings: null,
            recent_logs: []
          }
        }
      }
      
      return {
        success: true,
        data: {
          profile: adminProfile,
          security_settings: null,
          recent_logs: []
        }
      }
    }

    const { data: profileData, error: profileError } = await profileQuery.single()

    if (profileError) {
      logger.error('❌ Erro ao buscar perfil:', profileError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar dados do perfil'
      })
    }

    // Buscar configurações de segurança
    let securityQuery = supabase
      .from('admin_security_settings')
      .select('*')

    // Only filter by admin_id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      securityQuery = securityQuery.eq('admin_id', user.id)
    }

    const { data: securitySettings } = await securityQuery.single()

    // Buscar logs de segurança recentes
    let logsQuery = supabase
      .from('access_logs')
      .select('*')

    // Only filter by user_id if user.id is a valid UUID (not 'admin')
    if (user.id !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      logsQuery = logsQuery.eq('user_id', user.id)
    }

    const { data: recentLogs } = await logsQuery
      .order('created_at', { ascending: false })
      .limit(10)

    logger.info('✅ Dados do perfil carregados com sucesso')

    return {
      success: true,
      data: {
        ...profileData,
        phone: profileData.whatsapp, // Mapear whatsapp para phone para compatibilidade
        twoFactorEnabled: profileData.two_factor_enabled || false,
        securitySettings: securitySettings || {
          require2FA: false,
          googleAuth: false,
          multipleSessions: false,
          minPasswordLength: 8,
          requireSpecialChars: true,
          requireNumbers: true,
          loginAttempts: 5,
          apiRequests: 100,
          autoBlock: true
        },
        recentLogs: recentLogs || []
      }
    }

  } catch (error: any) {
    logger.error('❌ Erro na API profile GET:', error)
    
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