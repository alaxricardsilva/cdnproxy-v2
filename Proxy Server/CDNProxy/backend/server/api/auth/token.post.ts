import { defineEventHandler, createError, getHeader, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { generateJWT } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    console.error('🔍 [TOKEN] Iniciando conversão de token...')
    
    // Verificar método HTTP
    if (event.node.req.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // Obter token do Supabase do header ou body
    const authHeader = getHeader(event, 'authorization')
    console.error('📋 [TOKEN] Auth header:', authHeader ? 'PRESENTE' : 'AUSENTE')
    
    let body: any = {}
    
    try {
      body = await readBody(event)
      console.error('📋 [TOKEN] Body lido com sucesso:', JSON.stringify(body))
    } catch (error: any) {
      console.error('⚠️ [TOKEN] Erro ao ler body:', error.message)
      console.error('⚠️ [TOKEN] Stack trace:', error.stack)
      // Se não conseguir ler o body, continuar apenas com o header
    }
    
    const supabaseToken = authHeader?.replace('Bearer ', '') || body?.token
    
    console.error('📋 [TOKEN] Token recebido:', supabaseToken ? 'SIM' : 'NÃO')
    
    if (!supabaseToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token do Supabase é obrigatório'
      })
    }

    // Conectar ao Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.error('📋 [TOKEN] Supabase URL:', supabaseUrl ? 'CONFIGURADO' : 'NÃO CONFIGURADO')
    console.error('📋 [TOKEN] Service Key:', supabaseServiceKey ? 'CONFIGURADO' : 'NÃO CONFIGURADO')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Configuração do Supabase não encontrada'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.error('🔍 [TOKEN] Verificando token do Supabase...')
    
    // Verificar se o token do Supabase é válido
    const { data: { user }, error } = await supabase.auth.getUser(supabaseToken)
    
    console.error('📋 [TOKEN] Usuário encontrado:', user ? 'SIM' : 'NÃO')
    console.error('📋 [TOKEN] Erro de auth:', error ? error.message : 'NENHUM')
    
    if (error || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token do Supabase inválido'
      })
    }

    // Buscar dados do usuário no banco
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Usuário não encontrado no banco de dados'
      })
    }

    // Gerar JWT personalizado
    const jwtPayload = {
      userId: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role
    }

    const customJWT = generateJWT(jwtPayload)

    return {
      success: true,
      token: customJWT,
      user: userData
    }

  } catch (error: any) {
    console.error('Erro ao converter token:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})