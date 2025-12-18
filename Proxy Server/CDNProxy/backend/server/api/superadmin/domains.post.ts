import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { validateTargetUrl } from '../../../utils/url-validation'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAINS POST API] Iniciando...')
    
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [DOMAINS POST API] Autenticação OK:', user.id)

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    logger.info('📋 [DOMAINS POST API] Dados recebidos:', body)

    // Validar campos obrigatórios
    if (!body.domain || !body.target_url || !body.user_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Campos obrigatórios: domain, target_url, user_id'
      })
    }

    // Validar e normalizar target_url
    const validationResult = validateTargetUrl(body.target_url)
    if (!validationResult.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: `URL inválida: ${validationResult.error}`
      })
    }

    // Verificar se o domínio já existe
    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select('id')
      .eq('domain', body.domain)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('❌ [DOMAINS POST API] Erro ao verificar domínio existente:', checkError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao verificar domínio: ${checkError.message}`
      })
    }

    if (existingDomain) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Domínio já existe'
      })
    }

    // Verificar se o usuário existe
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', body.user_id)
      .single()

    if (userError || !userExists) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Usuário não encontrado'
      })
    }

    // Preparar dados para inserção
    const domainData = {
      domain: body.domain.toLowerCase().trim(),
      target_url: validationResult.url,
      user_id: body.user_id,
      plan_id: body.plan_id || null,
      status: body.status || 'active',
      ssl_enabled: body.ssl_enabled !== false,
      analytics_enabled: body.analytics_enabled !== false, // Analytics habilitado por padrão
      expires_at: body.expires_at || null,
      redirect_301: body.redirect_301 || false,
      redirect_url: body.redirect_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    logger.info('💾 [DOMAINS POST API] Inserindo domínio:', domainData)

    // Inserir domínio
    const { data: newDomain, error: insertError } = await supabase
      .from('domains')
      .insert(domainData)
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          company
        ),
        plans(
          id,
          name,
          description,
          max_domains,
          max_bandwidth_gb,
          price,
          duration_value,
          duration_type
        )
      `)
      .single()

    if (insertError) {
      logger.error('❌ [DOMAINS POST API] Erro ao inserir domínio:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao criar domínio: ${insertError.message}`
      })
    }

    logger.info('✅ [DOMAINS POST API] Domínio criado com sucesso:', newDomain.id)

    return {
      success: true,
      data: newDomain,
      message: 'Domínio criado com sucesso'
    }

  } catch (error: any) {
    logger.error('💥 [DOMAINS POST API] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})