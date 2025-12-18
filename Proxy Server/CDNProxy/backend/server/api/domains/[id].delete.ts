import { logger } from '~/utils/logger'
import { requireUserAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    const domainId = getRouterParam(event, 'id')
    
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    // Check if domain exists and belongs to user
    const { data: domain, error: fetchError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !domain) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }

    // Delete domain - verificar se user.id é UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user.id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID de usuário inválido'
      })
    }

    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', user.id)

    if (deleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao deletar domínio'
      })
    }

    return {
      success: true,
      message: 'Domínio deletado com sucesso'
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