import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate superadmin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    const body = await readBody(event)
    
    // Validar dados obrigatórios
    if (!body.key_type || !body.key || !body.receiver_name || !body.city) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados obrigatórios não fornecidos'
      })
    }

    // Validar tipo de chave PIX
    const validKeyTypes = ['email', 'cpf', 'cnpj', 'phone', 'random']
    if (!validKeyTypes.includes(body.key_type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tipo de chave PIX inválido'
      })
    }

    // Usar UPSERT para evitar duplicatas
    const configData = {
      key_type: body.key_type,
      key: body.key,
      receiver_name: body.receiver_name,
      city: body.city,
      enabled: body.enabled !== undefined ? body.enabled : true, // Ativado por padrão
      updated_at: new Date().toISOString()
    }

    // Usar upsert para inserir ou atualizar
    const { data: result, error } = await supabase
      .from('pix_config')
      .upsert({
        ...configData,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      logger.error('Erro ao salvar configurações PIX:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao salvar configurações PIX'
      })
    }

    return {
      success: true,
      data: result,
      message: 'Configurações PIX salvas com sucesso'
    }
  } catch (error: any) {
    logger.error('Erro no endpoint pix-config POST:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})