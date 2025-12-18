import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody, getHeader, getRouterParam } from 'h3'
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

    // Read request body
    const body = await readBody(event)
    const { name, hostname, ip_address, region, type, status, notes } = body

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

    // Validate type if provided
    if (type) {
      const validTypes = ['PRIMARY', 'SECONDARY', 'CACHE', 'BACKUP']
      if (!validTypes.includes(type)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Tipo inválido. Valores aceitos: PRIMARY, SECONDARY, CACHE, BACKUP'
        })
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR']
      if (!validStatuses.includes(status)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Status inválido. Valores aceitos: ONLINE, OFFLINE, MAINTENANCE, ERROR'
        })
      }
    }

    // Check if hostname or IP conflicts with other servers (excluding current one)
    if (hostname || ip_address) {
      const conditions = []
      if (hostname && hostname !== existingServer.hostname) {
        conditions.push(`hostname.eq.${hostname}`)
      }
      if (ip_address && ip_address !== existingServer.ip_address) {
        conditions.push(`ip_address.eq.${ip_address}`)
      }

      if (conditions.length > 0) {
        const { data: conflictingServer } = await supabase
          .from('servers')
          .select('id')
          .or(conditions.join(','))
          .neq('id', serverId)
          .single()

        if (conflictingServer) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Já existe outro servidor com este hostname ou IP'
          })
        }
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (typeof name !== 'undefined' && name !== null) updateData.name = name
    if (typeof hostname !== 'undefined' && hostname !== null) updateData.hostname = hostname
    if (typeof ip_address !== 'undefined' && ip_address !== null) updateData.ip_address = ip_address
    if (typeof region !== 'undefined' && region !== null) updateData.region = region
    if (typeof type !== 'undefined' && type !== null) updateData.type = type
    if (typeof status !== 'undefined' && status !== null) updateData.status = status
    if (typeof notes !== 'undefined' && notes !== null) updateData.notes = notes

    // Update server
    const { data: updatedServer, error: updateError } = await supabase
      .from('servers')
      .update(updateData)
      .eq('id', serverId)
      .select()
      .single()

    if (updateError) {
      logger.error('Erro ao atualizar servidor:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao atualizar servidor'
      })
    }

    // Log the action
    await supabase
      .from('admin_logs')
      .insert([{
        admin_id: user.id,
        action: 'UPDATE_SERVER',
        resource_type: 'server',
        resource_id: serverId,
        details: {
          changes: {
            name: { from: existingServer.name, to: name },
            hostname: { from: existingServer.hostname, to: hostname },
            ip_address: { from: existingServer.ip_address, to: ip_address },
            region: { from: existingServer.region, to: region },
            type: { from: existingServer.type, to: type },
            status: { from: existingServer.status, to: status },
            notes: { from: existingServer.notes, to: notes }
          }
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      }])

    return {
      success: true,
      message: 'Servidor atualizado com sucesso',
      data: {
        id: updatedServer.id,
        name: updatedServer.name,
        hostname: updatedServer.hostname,
        ip_address: updatedServer.ip_address,
        region: updatedServer.region,
        type: updatedServer.type,
        status: updatedServer.status,
        notes: updatedServer.notes,
        created_at: updatedServer.created_at,
        updated_at: updatedServer.updated_at
      }
    }

  } catch (error: any) {
    logger.error('Erro ao atualizar servidor:', error)
    
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