import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    // Verificar método HTTP
    if (getMethod(event) !== 'PATCH') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Método não permitido'
      })
    }

    // Obter token de autenticação
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de acesso requerido'
      })
    }

    const token = authHeader.substring(7)
    
    // Verificar e decodificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (!decoded || !decoded.userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Criar cliente Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar se usuário existe e tem permissão de ADMIN
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', decoded.userId)
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Usuário não encontrado'
      })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado. Apenas ADMINs podem editar domínios.'
      })
    }

    // Obter ID do domínio da URL
    const domainId = getRouterParam(event, 'id')
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    // Obter dados do corpo da requisição
    const body = await readBody(event)
    
    // Validar campos permitidos para ADMIN (apenas target_url e redirect_301)
    const allowedFields = ['target_url', 'redirect_301']
    const updateData: any = {}

    for (const field of allowedFields) {
      if (typeof body[field] !== 'undefined' && body[field] !== null) {
        updateData[field] = body[field]
      }
    }

    // Verificar se há campos para atualizar
    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nenhum campo válido fornecido para atualização'
      })
    }

    // Validar URL de destino se fornecida
    if (updateData.target_url) {
      try {
        new URL(updateData.target_url)
      } catch {
        throw createError({
          statusCode: 400,
          statusMessage: 'URL de destino inválida'
        })
      }
    }

    // Verificar se o domínio existe e pertence ao usuário logado
    const { data: existingDomain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain, expires_at, status, user_id')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (domainError || !existingDomain) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado ou não pertence ao usuário'
      })
    }

    // Verificar se o domínio não está expirado
    if (existingDomain.expires_at && new Date(existingDomain.expires_at) < new Date()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Não é possível editar domínio expirado'
      })
    }

    // Atualizar domínio
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)
      .select(`
        id,
        domain,
        target_url,
        redirect_301,
        status,
        created_at,
        updated_at,
        expires_at
      `)
      .single()

    if (updateError) {
      logger.error('Erro ao atualizar domínio:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro interno do servidor'
      })
    }

    return {
      success: true,
      data: updatedDomain,
      message: 'Domínio atualizado com sucesso'
    }

  } catch (error: any) {
    logger.error('Erro na API admin/domains/[id].patch:', error)
    
    // Se já é um erro HTTP, re-lançar
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