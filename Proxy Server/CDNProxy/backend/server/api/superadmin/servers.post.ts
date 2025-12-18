import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

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

    // Read request body
    const body = await readBody(event)
    const { name, hostname, ip_address, region, type, notes } = body

    // Validate required fields
    if (!name || !hostname || !ip_address || !region || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Campos obrigatórios: name, hostname, ip_address, region, type'
      })
    }

    // Validate type
    const validTypes = ['PRIMARY', 'SECONDARY', 'CACHE', 'BACKUP']
    if (!validTypes.includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tipo inválido. Valores aceitos: PRIMARY, SECONDARY, CACHE, BACKUP'
      })
    }

    // Check if server with same hostname or IP already exists
    const { data: existingServer } = await supabase
      .from('servers')
      .select('id')
      .or(`hostname.eq.${hostname},ip_address.eq.${ip_address}`)
      .single()

    if (existingServer) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Já existe um servidor com este hostname ou IP'
      })
    }

    // Create new server
    const { data: newServer, error } = await supabase
      .from('servers')
      .insert([{
        name,
        hostname,
        ip_address,
        region,
        type,
        status: 'OFFLINE', // Default status until first health check
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar servidor:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao criar servidor'
      })
    }

    // Log the action
    await supabase
      .from('admin_logs')
      .insert([{
        admin_id: user.id,
        action: 'CREATE_SERVER',
        resource_type: 'server',
        resource_id: newServer.id,
        details: {
          server_name: name,
          hostname,
          ip_address,
          region,
          type
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      }])

    return {
      success: true,
      message: 'Servidor adicionado com sucesso',
      data: {
        id: newServer.id,
        name: newServer.name,
        hostname: newServer.hostname,
        ip_address: newServer.ip_address,
        region: newServer.region,
        type: newServer.type,
        status: newServer.status,
        notes: newServer.notes,
        created_at: newServer.created_at,
        updated_at: newServer.updated_at
      }
    }

  } catch (error: any) {
    logger.error('Erro ao adicionar servidor:', error)
    
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