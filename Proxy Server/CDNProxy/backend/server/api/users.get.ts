import { logger } from '~/utils/logger'
import { requireUserAuth } from '../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação do usuário
    const { user, supabase } = await requireUserAuth(event)

    // Verificar se o usuário tem privilégios de admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || !['ADMIN', 'SUPERADMIN'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado. Apenas administradores podem acessar esta API.'
      })
    }

    // Parâmetros de paginação e filtros
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 20
    const search = query.search as string
    const role = query.role as string
    const status = query.status as string
    const offset = (page - 1) * limit

    // Construir query base
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        status,
        company,
        whatsapp,
        created_at,
        updated_at,
        two_factor_enabled,
        plan,
        plan_status
      `, { count: 'exact' })

    // Aplicar filtros
    if (search) {
      usersQuery = usersQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (role) {
      usersQuery = usersQuery.eq('role', role)
    }

    if (status) {
      usersQuery = usersQuery.eq('status', status)
    }

    // Aplicar paginação
    usersQuery = usersQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data: users, error: usersError, count } = await usersQuery

    if (usersError) {
      logger.error('Erro ao buscar usuários:', usersError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar usuários'
      })
    }

    // Buscar estatísticas gerais
    const { data: allUsers } = await supabase
      .from('users')
      .select('role, status')

    const stats = {
      total: count || 0,
      active: allUsers?.filter(u => u.status === 'active').length || 0,
      inactive: allUsers?.filter(u => u.status === 'inactive').length || 0,
      admins: allUsers?.filter(u => u.role === 'ADMIN').length || 0,
      superadmins: allUsers?.filter(u => u.role === 'SUPERADMIN').length || 0,
      users: allUsers?.filter(u => u.role === 'USER').length || 0
    }

    return {
      success: true,
      data: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      stats
    }

  } catch (error: any) {
    logger.error('Erro na API /users:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})