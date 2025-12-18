import { defineEventHandler, createError, readBody, getHeader } from 'h3'
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
      .select('id, name, email, role, status, company, whatsapp, two_factor_enabled')
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

    // Return user data for frontend
    return {
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
        status: userProfile.status,
        company: userProfile.company,
        whatsapp: userProfile.whatsapp,
        two_factor_enabled: userProfile.two_factor_enabled
      },
      token: token
    }

  } catch (error: any) {
    console.error('Erro no endpoint auth/exchange:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})