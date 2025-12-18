import { defineEventHandler, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get token from header
    const token = getHeader(event, 'x-supabase-token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
    
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de acesso requerido'
      })
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Perfil do usuário não encontrado'
      })
    }

    if (userProfile.status?.toLowerCase() !== 'active') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Conta inativa'
      })
    }

    // Verify if user is SUPERADMIN
    if (userProfile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado - apenas superadmin'
      })
    }

    // Return success response
    return {
      success: true,
      message: 'Usuário verificado como superadmin',
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role
      }
    }

  } catch (error: any) {
    console.error('Erro no endpoint auth/verify-superadmin:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})