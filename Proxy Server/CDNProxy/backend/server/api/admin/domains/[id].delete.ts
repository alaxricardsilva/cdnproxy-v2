import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    // Verificar método HTTP
    if (getMethod(event) !== 'DELETE') {
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
        statusMessage: 'Acesso negado. Apenas ADMINs podem excluir domínios.'
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

    // Verificar se o domínio existe
    const { data: existingDomain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain, user_id')
      .eq('id', domainId)
      .single()

    if (domainError || !existingDomain) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    // Excluir o domínio (ADMIN pode excluir qualquer domínio)
    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', domainId)

    if (deleteError) {
      logger.error('Erro ao excluir domínio:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro interno do servidor'
      })
    }

    return {
      success: true,
      message: 'Domínio excluído com sucesso'
    }

  } catch (error: any) {
    logger.error('Erro na API admin/domains/[id].delete:', error)
    
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