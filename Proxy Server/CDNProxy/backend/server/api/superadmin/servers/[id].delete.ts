import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getHeader, getRouterParam } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    
    // Check if user has superadmin privileges
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    if (!profile || profile.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      })
    }

    // Get server ID from route
    const serverId = getRouterParam(event, 'id')
    if (!serverId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do servidor é obrigatório'
      })
    }

    // Get existing server
    const { data: existingServer, error: fetchError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single()

    if (fetchError || !existingServer) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Servidor não encontrado'
      })
    }

    // Prevent deletion of PRIMARY servers if they are the only ones
    if (existingServer.type === 'PRIMARY') {
      const { data: primaryServers, error: countError } = await supabase
        .from('servers')
        .select('id')
        .eq('type', 'PRIMARY')

      if (countError) {
        logger.error('Erro ao contar servidores primários:', countError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Erro ao verificar servidores primários'
        })
      }

      if (primaryServers && primaryServers.length <= 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Não é possível remover o último servidor primário'
        })
      }
    }

    // Check if server has active connections or is currently serving traffic
    // This is a placeholder for future implementation
    // You might want to check if the server is currently handling requests
    if (existingServer.status === 'ONLINE') {
      // For now, we'll allow deletion but log a warning
      console.warn(`Deletando servidor online: ${existingServer.name} (${existingServer.hostname})`)
    }

    // Delete the server
    const { error: deleteError } = await supabase
      .from('servers')
      .delete()
      .eq('id', serverId)

    if (deleteError) {
      logger.error('Erro ao deletar servidor:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao deletar servidor'
      })
    }

    // Log the action
    await supabase
      .from('admin_logs')
      .insert([{
        admin_id: user.id,
        action: 'DELETE_SERVER',
        resource_type: 'server',
        resource_id: serverId,
        details: {
          deleted_server: {
            name: existingServer.name,
            hostname: existingServer.hostname,
            ip_address: existingServer.ip_address,
            region: existingServer.region,
            type: existingServer.type,
            status: existingServer.status
          }
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      }])

    return {
      success: true,
      message: 'Servidor removido com sucesso',
      data: {
        deleted_server: {
          id: existingServer.id,
          name: existingServer.name,
          hostname: existingServer.hostname,
          ip_address: existingServer.ip_address,
          region: existingServer.region,
          type: existingServer.type
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro ao deletar servidor:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Helper function to get client IP
function getClientIP(event: any): string {
  return getHeader(event, 'x-forwarded-for') || 
         getHeader(event, 'x-real-ip') || 
         getHeader(event, 'cf-connecting-ip') || 
         'unknown'
}