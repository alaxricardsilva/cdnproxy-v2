import { logger } from '~/utils/logger'
import { requireUserAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação do usuário
    const { user, supabase } = await requireUserAuth(event)

    // Buscar dados do usuário
    const { data: userProfile, error: userError } = await supabase
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
        two_factor_enabled,
        plan,
        plan_status,
        plan_expires_at
      `)
      .eq('id', user.id)
      .single()

    if (userError) {
      logger.error('Erro ao buscar perfil do usuário:', userError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar dados do usuário'
      })
    }

    // Buscar estatísticas do usuário se necessário
    const { data: userStats } = await supabase
      .from('domains')
      .select('id, active')
      .eq('user_id', user.id)

    const totalDomains = userStats?.length || 0
    const activeDomains = userStats?.filter(d => d.active).length || 0

    return {
      success: true,
      data: {
        ...userProfile,
        stats: {
          totalDomains,
          activeDomains,
          inactiveDomains: totalDomains - activeDomains
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro na API /auth/me:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})