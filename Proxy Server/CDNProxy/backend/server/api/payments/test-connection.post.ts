import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getHeader, getCookie } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { verifyJWT } from '../../../utils/auth'
import { getPagBankClient } from '../../../utils/pagbank-client'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação
    const token = getCookie(event, 'auth-token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Verificar se é superadmin
    if (payload.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      })
    }

    // Conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Obter cliente PagBank
    const pagBankClient = await getPagBankClient()
    if (!pagBankClient) {
      throw createError({
        statusCode: 400,
        statusMessage: 'PagBank não configurado'
      })
    }

    // Testar conexão
    const isConnected = await pagBankClient.testConnection()

    return {
      success: true,
      data: {
        connected: isConnected,
        message: isConnected ? 'Conexão com PagBank estabelecida com sucesso' : 'Falha na conexão com PagBank'
      }
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})