import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'
import { z } from 'zod'

// Schema de validação para edição de usuário
const updateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN'], {
    errorMap: () => ({ message: 'Role deve ser USER, ADMIN ou SUPERADMIN' })
  }),
  company: z.string().optional(),
  whatsapp: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status deve ser ACTIVE ou INACTIVE' })
  }),
  observations: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional()
})

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Get user ID from route params
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do usuário é obrigatório'
      })
    }

    // Parse and validate request body
    const body = await readBody(event)
    const userData = updateUserSchema.parse(body)

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      logger.error('Usuário não encontrado:', { userId, error: fetchError })
      throw createError({
        statusCode: 404,
        statusMessage: `Usuário com ID '${userId}' não foi encontrado no sistema`
      })
    }

    // Check if email is already in use by another user
    if (userData.email !== existingUser.email) {
      const { data: emailCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .neq('id', userId)
        .single()

      if (emailCheck) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Email já está em uso por outro usuário'
        })
      }
    }

    // Update user profile in database
    const updateData: any = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      company: userData.company,
      whatsapp: userData.whatsapp,
      status: userData.status,
      observations: userData.observations,
      updated_at: new Date().toISOString()
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao atualizar usuário: ${updateError.message}`
      })
    }

    // Update password if provided
    if (userData.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: userData.password }
      )

      if (passwordError) {
        logger.error('Erro ao atualizar senha:', passwordError)
        // Don't throw error here, user was updated successfully
      }
    }

    // Update email in auth if changed
    if (userData.email !== existingUser.email) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(
        userId,
        { email: userData.email }
      )

      if (emailError) {
        logger.error('Erro ao atualizar email no auth:', emailError)
        // Don't throw error here, user was updated successfully in database
      }
    }

    return {
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        company: updatedUser.company,
        whatsapp: updatedUser.whatsapp,
        status: updatedUser.status,
        observations: updatedUser.observations,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      }
    }

  } catch (error) {
    logger.error('Erro na API de edição de usuário:', error)
    
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.errors[0].message
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})