import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate superadmin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    // Buscar configurações PIX
    const { data, error } = await supabase
      .from('pix_config')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error('Erro ao buscar configurações PIX:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro interno do servidor'
      })
    }

    return {
      success: true,
      data: data || null
    }
  } catch (error: any) {
    logger.error('Erro no endpoint pix-config GET:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})