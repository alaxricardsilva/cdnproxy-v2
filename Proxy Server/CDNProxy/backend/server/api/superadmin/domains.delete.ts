import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAINS DELETE API] Iniciando...')
    
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ [DOMAINS DELETE API] Autenticação OK:', user.id)

    // Ler dados do corpo da requisição
    const body = await readBody(event)
    logger.info('📋 [DOMAINS DELETE API] Dados recebidos:', body)

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
      logger.error('❌ [DOMAINS DELETE API] Domínio não encontrado:', checkError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    logger.info('🗑️ [DOMAINS DELETE API] Excluindo domínio:', existingDomain.domain)

    // Excluir domínio
    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', body.id)

    if (deleteError) {
      logger.error('❌ [DOMAINS DELETE API] Erro ao excluir domínio:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao excluir domínio: ${deleteError.message}`
      })
    }

    logger.info('✅ [DOMAINS DELETE API] Domínio excluído com sucesso:', body.id)

    return {
      success: true,
      message: 'Domínio excluído com sucesso'
    }

  } catch (error: any) {
    logger.error('💥 [DOMAINS DELETE API] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})