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

    // Check if user exists and get current status
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, status, email')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado'
      })
    }

    // Prevent superadmin from deactivating themselves
    if (existingUser.email === user.email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Você não pode alterar seu próprio status'
      })
    }

    // Toggle status
    const newStatus = existingUser.status === 'active' ? 'inactive' : 'active'

    // Update user status
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao alterar status do usuário'
      })
    }

    return {
      success: true,
      message: `Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso`,
      data: updatedUser
    }

  } catch (error) {
    logger.error('Erro ao alterar status do usuário:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})