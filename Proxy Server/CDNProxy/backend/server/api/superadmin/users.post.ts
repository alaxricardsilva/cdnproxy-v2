import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { z } from 'zod'

// Schema de validação para criação de usuário
const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email deve ser válido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']).default('USER'),
  company: z.string().optional(),
  whatsapp: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  notes: z.string().optional(),
  observations: z.string().optional()
})

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Parse and validate request body
    const body = await readBody(event)
    const userData = createUserSchema.parse(body)

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email já está em uso'
      })
    }

    // Create user in Supabase Auth
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
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
        email: userData.email,
        name: userData.name,
        role: userData.role,
        company: userData.company,
        whatsapp: userData.whatsapp,
        status: userData.status,
        notes: userData.notes,
        observations: userData.observations,
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createUserError) {
      // If user profile creation fails, delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao criar perfil do usuário: ${createUserError.message}`
      })
    }

    return {
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        company: newUser.company,
        whatsapp: newUser.whatsapp,
        plan: newUser.plan,
        status: newUser.status,
        notes: newUser.notes,
        observations: newUser.observations,
        created_at: newUser.created_at
      }
    }

  } catch (error) {
    // Handle validation errors
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: `Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`
      })
    }

    // Re-throw other errors
    throw error
  }
})