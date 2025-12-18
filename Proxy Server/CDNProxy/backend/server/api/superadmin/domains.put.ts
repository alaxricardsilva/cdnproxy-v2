import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { validateTargetUrl } from '../../../utils/url-validation'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAINS PUT API] Iniciando...')
    
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [DOMAINS PUT API] Autenticação OK:', user.id)

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    logger.info('📋 [DOMAINS PUT API] Dados recebidos:', body)

    // Validar campo obrigatório
    if (!body.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Campo obrigatório: id'
      })
    }

    // Verificar se o domínio existe
    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', body.id)
      .single()

    if (checkError || !existingDomain) {
      logger.error('❌ [DOMAINS PUT API] Domínio não encontrado:', checkError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    // Preparar dados para atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Validar e atualizar campos se fornecidos
    if (typeof body.domain !== 'undefined' && body.domain !== null) {
      // Verificar se o novo domínio já existe (exceto o atual)
      const { data: domainExists, error: domainError } = await supabase
        .from('domains')
        .select('id')
        .eq('domain', body.domain.toLowerCase().trim())
        .neq('id', body.id)
        .single()

      if (domainError && domainError.code !== 'PGRST116') {
        logger.error('❌ [DOMAINS PUT API] Erro ao verificar domínio:', domainError)
        throw createError({
          statusCode: 500,
          statusMessage: `Erro ao verificar domínio: ${domainError.message}`
        })
      }

      if (domainExists) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Domínio já existe'
        })
      }

      updateData.domain = body.domain.toLowerCase().trim()
    }

    if (typeof body.target_url !== 'undefined' && body.target_url !== null) {
      const validationResult = validateTargetUrl(body.target_url)
      if (!validationResult.valid) {
        throw createError({
          statusCode: 400,
          statusMessage: `URL inválida: ${validationResult.error}`
        })
      }
      updateData.target_url = validationResult.url
    }

    if (typeof body.user_id !== 'undefined' && body.user_id !== null) {
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
      updateData.user_id = body.user_id
    }

    if (typeof body.plan_id !== 'undefined' && body.plan_id !== null) {
      // Verificar se o plano existe
      const { data: planExists, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('id', body.plan_id)
        .single()

      if (planError || !planExists) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Plano não encontrado. Verifique se o plan_id é válido.'
        })
      }
      updateData.plan_id = body.plan_id
    }

    if (typeof body.status !== 'undefined' && body.status !== null) {
      updateData.status = body.status
    }

    if (typeof body.ssl_enabled !== 'undefined' && body.ssl_enabled !== null) {
      updateData.ssl_enabled = body.ssl_enabled
    }

    if (typeof body.analytics_enabled !== 'undefined' && body.analytics_enabled !== null) {
      updateData.analytics_enabled = body.analytics_enabled
    }

    if (typeof body.expires_at !== 'undefined' && body.expires_at !== null) {
      updateData.expires_at = body.expires_at
    }

    if (typeof body.redirect_301 !== 'undefined' && body.redirect_301 !== null) {
      updateData.redirect_301 = body.redirect_301
    }

    logger.info('💾 [DOMAINS PUT API] Atualizando domínio:', updateData)

    // Atualizar domínio
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update(updateData)
      .eq('id', body.id)
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

    if (updateError) {
      logger.error('❌ [DOMAINS PUT API] Erro ao atualizar domínio:', updateError)
      
      // Detectar violações de foreign key constraint
      if (updateError.message.includes('violates foreign key constraint')) {
        if (updateError.message.includes('fk_domains_plan_id')) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Plano não encontrado. Verifique se o plan_id é válido.'
          })
        }
        if (updateError.message.includes('fk_domains_user_id')) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Usuário não encontrado. Verifique se o user_id é válido.'
          })
        }
        // Outras violações de foreign key
        throw createError({
          statusCode: 400,
          statusMessage: 'Dados inválidos. Verifique se todos os IDs referenciados existem.'
        })
      }
      
      // Detectar violações de unique constraint
      if (updateError.message.includes('duplicate key value violates unique constraint')) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Domínio já existe. Escolha um nome diferente.'
        })
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao atualizar domínio: ${updateError.message}`
      })
    }

    logger.info('✅ [DOMAINS PUT API] Domínio atualizado com sucesso:', updatedDomain.id)

    return {
      success: true,
      data: updatedDomain,
      message: 'Domínio atualizado com sucesso'
    }

  } catch (error: any) {
    logger.error('💥 [DOMAINS PUT API] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})