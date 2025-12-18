import { logger } from '~/utils/logger'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string || ''
    const role = query.role as string || ''
    const status = query.status as string || ''

    // Check if user has superadmin privileges
    // Para admin local, pular a verificação no banco
    if (user.id === 'admin') {
      // Admin local já foi validado na função requireAdminAuth
      logger.info('✅ [admins.get] Admin local detectado, pulando verificação no banco')
    } else {
      // Verificar se user.email existe antes de fazer a query
      if (!user.email) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Email do usuário não encontrado'
        })
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('email', user.email)
        .single()

      if (!userProfile || userProfile.role !== 'SUPERADMIN') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Acesso negado - apenas superadmin'
        })
      }
    }

    // Build admins query (users with ADMIN or SUPERADMIN role)
    let adminsQuery = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .in('role', ['ADMIN', 'SUPERADMIN'])

    // Add search filter
    if (search) {
      adminsQuery = adminsQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Add role filter
    if (role) {
      adminsQuery = adminsQuery.eq('role', role)
    }

    // Add status filter
    if (status) {
      adminsQuery = adminsQuery.eq('status', status)
    }

    // Add pagination
    const offset = (page - 1) * limit
    adminsQuery = adminsQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Execute query
    const { data: admins, error, count } = await adminsQuery

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar administradores'
      })
    }

    // Get admin statistics
    const { data: allAdmins } = await supabase
      .from('users')
      .select('role, status')
      .in('role', ['ADMIN', 'SUPERADMIN'])

    const stats = {
      total: allAdmins?.length || 0,
      active: allAdmins?.filter(admin => admin.status === 'active').length || 0,
      pending: allAdmins?.filter(admin => admin.status === 'PENDING').length || 0,
      blocked: allAdmins?.filter(admin => admin.status === 'BLOCKED').length || 0,
      superadmins: allAdmins?.filter(admin => admin.role === 'SUPERADMIN').length || 0,
      admins: allAdmins?.filter(admin => admin.role === 'ADMIN').length || 0
    }

    // Format admin data
    const formattedAdmins = admins?.map(admin => ({
      id: admin.id,
      name: admin.name || 'N/A',
      email: admin.email,
      role: admin.role,
      status: admin.status || 'ACTIVE',
      avatar: admin.avatar || null,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
      last_login: admin.last_login || null,
      company: admin.company || null,
      whatsapp: admin.whatsapp || null
    })) || []

    return {
      success: true,
      data: formattedAdmins,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    }

  } catch (error: any) {
    logger.error('Erro na API de administradores:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})