import { logger } from '../../../utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [stats-test] Iniciando teste do endpoint stats...')
    
    // Verificar autenticação SUPERADMIN
    logger.info('🔍 [stats-test] Verificando autenticação...')
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    
    logger.info('✅ [stats-test] Autenticação bem-sucedida:', { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    })

    // Teste simples de consulta
    logger.info('🔍 [stats-test] Testando consulta simples...')
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact' })

    if (usersError) {
      logger.error('❌ [stats-test] Erro na consulta users:', usersError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro na consulta users: ' + usersError.message
      })
    }

    logger.info('✅ [stats-test] Consulta users bem-sucedida:', { count: usersCount })

    return {
      success: true,
      message: 'Teste bem-sucedido!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        usersCount
      }
    }

  } catch (error: any) {
    logger.error('❌ [stats-test] Erro no endpoint:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})