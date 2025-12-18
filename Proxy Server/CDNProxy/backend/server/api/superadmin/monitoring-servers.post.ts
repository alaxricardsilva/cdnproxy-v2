import { logger } from '~/utils/logger'
import { requireAdminAuth } from '~/utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('📝 [CREATE MONITORING SERVER API] Iniciando criação/atualização...')
    
    // Verificar autenticação de superadmin (apenas SUPERADMIN pode criar/editar)
    const { user, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    
    // Obter dados do corpo da requisição
    const body = await readBody(event)
    const { id, name, description, base_url, api_key, is_active, is_default } = body
    
    // Validações básicas
    if (!name || !base_url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nome e URL base são obrigatórios'
      })
    }
    
    // Validar formato da URL
    try {
      new URL(base_url)
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'URL base inválida'
      })
    }
    
    const serverData = {
      name: name.trim(),
      description: description?.trim() || null,
      base_url: base_url.trim(),
      api_key: api_key?.trim() || null,
      is_active: is_active !== false, // default true
      is_default: is_default === true,
      updated_at: new Date().toISOString()
    }
    
    let result
    
    if (id) {
      // Atualizar servidor existente
      logger.info(`🔄 [CREATE MONITORING SERVER API] Atualizando servidor ${id}...`)
      
      const { data, error } = await supabase
        .from('monitoring_servers')
        .update(serverData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        logger.error('❌ [CREATE MONITORING SERVER API] Erro ao atualizar:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Erro ao atualizar servidor'
        })
      }
      
      result = data
      
    } else {
      // Criar novo servidor
      logger.info('➕ [CREATE MONITORING SERVER API] Criando novo servidor...')
      
      const { data, error } = await supabase
        .from('monitoring_servers')
        .insert([{
          ...serverData,
          created_by: user.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) {
        logger.error('❌ [CREATE MONITORING SERVER API] Erro ao criar:', error)
        
        if (error.code === '23505') { // unique constraint violation
          throw createError({
            statusCode: 409,
            statusMessage: 'Já existe um servidor com este nome'
          })
        }
        
        throw createError({
          statusCode: 500,
          statusMessage: 'Erro ao criar servidor'
        })
      }
      
      result = data
    }
    
    // Se este servidor foi marcado como padrão, desmarcar os outros
    if (is_default) {
      logger.info('🔄 [CREATE MONITORING SERVER API] Desmarcando outros servidores como padrão...')
      
      await supabase
        .from('monitoring_servers')
        .update({ is_default: false })
        .neq('id', result.id)
    }
    
    logger.info(`✅ [CREATE MONITORING SERVER API] Servidor ${id ? 'atualizado' : 'criado'} com sucesso`)
    
    return {
      success: true,
      data: result,
      message: `Servidor ${id ? 'atualizado' : 'criado'} com sucesso`
    }
    
  } catch (error: any) {
    logger.error('❌ [CREATE MONITORING SERVER API] Erro:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})