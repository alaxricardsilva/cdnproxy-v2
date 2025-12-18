import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Get user from headers
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    // Initialize Supabase client
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey
    )

    // Verify JWT token and check superadmin role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Check if user has superadmin privileges
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    if (!userProfile || userProfile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado - apenas superadmin'
      })
    }

    // Get user ID from route params
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do usuário é obrigatório'
      })
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    // Prevent superadmin from deleting themselves
    if (existingUser.email === user.email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Você não pode deletar sua própria conta'
      })
    }

    // Allow SUPERADMIN to delete other SUPERADMINs (as requested by user)
    // Only prevent self-deletion for security

    // Delete user from auth (this will cascade to the users table if properly configured)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      logger.error('Erro ao deletar usuário do auth:', deleteAuthError)
      // Continue with database deletion even if auth deletion fails
    }

    // Delete user from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao deletar usuário do banco de dados'
      })
    }

    return {
      success: true,
      message: 'Usuário deletado com sucesso'
    }

  } catch (error) {
    logger.error('Erro ao deletar usuário:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})