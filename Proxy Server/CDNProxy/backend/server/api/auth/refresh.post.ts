import { defineEventHandler, createError, getHeader, readBody } from 'h3'
import { verifyJWT, generateJWT } from '../../../utils/auth'
import { logger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [REFRESH] Iniciando refresh de token...')
    
    // Verificar método HTTP
    if (event.node.req.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // Obter token do header
    const authHeader = getHeader(event, 'authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    logger.info('📋 [REFRESH] Token recebido:', token ? 'SIM' : 'NÃO')
    
    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token é obrigatório'
      })
    }

    // Verificar token atual
    const payload = await verifyJWT(token)
    
    if (!payload) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Gerar novo token com os mesmos dados
    const newPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    }

    const newToken = generateJWT(newPayload)

    logger.info('✅ [REFRESH] Token renovado com sucesso para:', payload.email)
    
    return {
      success: true,
      token: newToken,
      expiresIn: '7d'
    }

  } catch (error: any) {
    logger.error('❌ [REFRESH] Erro ao renovar token:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})