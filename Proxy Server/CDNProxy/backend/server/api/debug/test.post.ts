import { defineEventHandler, createError, getHeader, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    console.error('🔍 [DEBUG] Iniciando teste de debug...')
    
    // Verificar método HTTP
    if (event.node.req.method !== 'POST') {
      console.error('❌ [DEBUG] Método não é POST:', event.node.req.method)
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    console.error('✅ [DEBUG] Método POST confirmado')

    // Obter headers
    const authHeader = getHeader(event, 'authorization')
    const contentType = getHeader(event, 'content-type')
    
    console.error('📋 [DEBUG] Auth header:', authHeader ? 'PRESENTE' : 'AUSENTE')
    console.error('📋 [DEBUG] Content-Type:', contentType || 'AUSENTE')
    
    // Tentar ler o body com tratamento de erro detalhado
    let body: any = null
    let bodyError: any = null
    
    try {
      console.error('🔍 [DEBUG] Tentando ler body...')
      body = await readBody(event)
      console.error('✅ [DEBUG] Body lido com sucesso:', JSON.stringify(body))
    } catch (error: any) {
      bodyError = error
      console.error('❌ [DEBUG] Erro ao ler body:', error.message)
      console.error('❌ [DEBUG] Tipo do erro:', error.constructor.name)
      console.error('❌ [DEBUG] Stack trace:', error.stack)
    }
    
    return {
      success: true,
      message: 'Debug endpoint funcionando',
      data: {
        method: event.node.req.method,
        headers: {
          authorization: authHeader ? 'PRESENTE' : 'AUSENTE',
          contentType: contentType || 'AUSENTE'
        },
        body: body,
        bodyError: bodyError ? {
          message: bodyError.message,
          type: bodyError.constructor.name
        } : null
      }
    }
  } catch (error: any) {
    console.error('❌ [DEBUG] Erro geral:', error.message)
    console.error('❌ [DEBUG] Stack trace:', error.stack)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})