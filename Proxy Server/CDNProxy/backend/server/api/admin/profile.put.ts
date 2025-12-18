import { logger } from '~/utils/logger'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default defineEventHandler(async (event) => {
  try {
    // Verificar método HTTP
    if (event.node.req.method !== 'PUT') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // Verificar autenticação
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de acesso requerido'
      })
    }

    const token = authHeader.substring(7)
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Verificar se é admin
    if (decoded.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      })
    }

    // Obter dados do corpo da requisição
    const body = await readBody(event)
    const { name, email, current_password, new_password } = body

    // Validações básicas
    if (!name || !email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nome e email são obrigatórios'
      })
    }

    // Verificar se o email já está em uso por outro usuário
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', decoded.userId)
      .single()

    if (existingUser) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email já está em uso'
      })
    }

    // Preparar dados para atualização
    const updateData: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      updated_at: new Date()
    }

    // Se uma nova senha foi fornecida, validar e criptografar
    if (new_password) {
      if (!current_password) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Senha atual é obrigatória para alterar a senha'
        })
      }

      // Buscar usuário atual para verificar senha
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('password')
        .eq('id', decoded.userId)
        .single()

      if (currentUserError || !currentUser) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Usuário não encontrado'
        })
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await bcrypt.compare(current_password, currentUser.password)
      if (!isCurrentPasswordValid) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Senha atual incorreta'
        })
      }

      // Validar nova senha
      if (new_password.length < 6) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Nova senha deve ter pelo menos 6 caracteres'
        })
      }

      // Criptografar nova senha
      const saltRounds = 12
      updateData.password = await bcrypt.hash(new_password, saltRounds)
    }

    // Atualizar usuário
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', decoded.userId)
      .select(`
        id,
        name,
        email,
        role,
        status,
        created_at,
        updated_at
      `)
      .single()

    if (updateError || !updatedUser) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao atualizar perfil'
      })
    }

    return {
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: updatedUser
    }

  } catch (error: any) {
    logger.error('Erro ao atualizar perfil:', error)

    // Se for um erro conhecido, retornar como está
    if (error.statusCode) {
      throw error
    }

    // Erro genérico
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})