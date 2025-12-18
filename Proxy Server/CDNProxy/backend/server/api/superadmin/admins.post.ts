import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Get request body
    const body = await readBody(event)
    const { name, email, password, role, status } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nome, email, senha e função são obrigatórios'
      })
    }

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

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email já está em uso'
      })
    }

    // Create user in Supabase Auth
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createAuthError) {
      throw createError({
        statusCode: 400,
        statusMessage: `Erro ao criar usuário: ${createAuthError.message}`
      })
    }

    // Create user profile in database
    const { data: newUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        name,
        role: role || 'ADMIN',
        status: status || 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createUserError) {
      // If user creation fails, delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao criar perfil do usuário: ${createUserError.message}`
      })
    }

    return {
      success: true,
      message: 'Administrador criado com sucesso',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        created_at: newUser.created_at
      }
    }

  } catch (error) {
    logger.error('Erro ao criar administrador:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})