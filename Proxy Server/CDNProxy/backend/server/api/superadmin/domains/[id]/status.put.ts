import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { requireAdminAuth } from '../../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAIN STATUS API] Iniciando...')
    
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [DOMAIN STATUS API] Autenticação OK:', user.id)

    // Obter ID do domínio da URL
    const domainId = getRouterParam(event, 'id')
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    logger.info('📋 [DOMAIN STATUS API] Dados recebidos:', { domainId, body })

    // Validar campo obrigatório
    if (!body.status) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Campo obrigatório: status'
      })
    }

    // Verificar se o domínio existe
    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single()

    if (checkError || !existingDomain) {
      logger.error('❌ [DOMAIN STATUS API] Domínio não encontrado:', checkError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    logger.info('🔄 [DOMAIN STATUS API] Alterando status do domínio:', {
      domain: existingDomain.domain,
      currentStatus: existingDomain.status,
      newStatus: body.status
    })

    // Atualizar status do domínio
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update({
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)
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
      logger.error('❌ [DOMAIN STATUS API] Erro ao atualizar status:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao atualizar status: ${updateError.message}`
      })
    }

    logger.info('✅ [DOMAIN STATUS API] Status atualizado com sucesso:', updatedDomain.id)

    return {
      success: true,
      data: updatedDomain,
      message: `Status alterado para ${body.status} com sucesso`
    }

  } catch (error: any) {
    logger.error('💥 [DOMAIN STATUS API] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})