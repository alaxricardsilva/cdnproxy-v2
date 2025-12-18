import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('=== Iniciando API de usuários ===')
    
    // Verificar autenticação SUPERADMIN
    logger.info('1. Verificando autenticação...')
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    logger.info('✅ Autenticação OK. Usuário:', user.email)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || ''
    const role = query.role as string || ''
    const status = query.status as string || ''

    logger.info('2. Parâmetros da query:', { page, limit, search, role, status })

    // Build users query
    logger.info('3. Construindo query de usuários...')
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        company,
        role,
        status,
        notes,
        observations,
        two_factor_enabled,
        created_at,
        updated_at
      `, { count: 'exact' })

    // Add search filter
    if (search) {
      logger.info('Aplicando filtro de busca:', search)
      usersQuery = usersQuery.or(`email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`)
    }

    // Add role filter
    if (role) {
      logger.info('Aplicando filtro de role:', role)
      usersQuery = usersQuery.eq('role', role)
    }

    // Add status filter
    if (status) {
      logger.info('Aplicando filtro de status:', status)
      usersQuery = usersQuery.eq('status', status)
    }

    // Add pagination
    const offset = (page - 1) * limit
    logger.info('4. Aplicando paginação:', { offset, limit })
    usersQuery = usersQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    logger.info('5. Executando query principal...')
    const { data: users, error, count } = await usersQuery

    if (error) {
      logger.error('❌ Erro na query principal:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar usuários'
      })
    }

    logger.info('✅ Query principal executada. Usuários encontrados:', count)

    // Get additional statistics
    logger.info('6. Buscando estatísticas...')
    const { data: stats } = await supabase
      .from('users')
      .select('role, status')

    const userStats = {
      total: count || 0,
      active: stats?.filter(u => u.status === 'active').length || 0,
      inactive: stats?.filter(u => u.status === 'inactive').length || 0,
      suspended: stats?.filter(u => u.status === 'suspended').length || 0,
      byRole: {
        superadmin: stats?.filter(u => u.role === 'SUPERADMIN').length || 0,
        admin: stats?.filter(u => u.role === 'ADMIN').length || 0,
        user: stats?.filter(u => u.role === 'USER').length || 0
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)

    logger.info('✅ API de usuários concluída com sucesso')

    return {
      success: true,
      data: users,
      stats: userStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }

  } catch (error: any) {
    logger.error('❌ Erro na API de usuários:', error)
    logger.error('Stack trace:', error.stack)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})