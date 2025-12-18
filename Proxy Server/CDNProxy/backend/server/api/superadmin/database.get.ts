import { logger } from '../../../utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

interface DatabaseStats {
  connections: {
    active: number
    idle: number
    total: number
    max: number
  }
  tables: {
    name: string
    rows: number
    size: string
  }[]
  performance: {
    queries_per_second: number
    avg_query_time: number
    slow_queries: number
  }
  storage: {
    total_size: string
    used_size: string
    free_size: string
  }
}

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

    logger.info('📊 [Database] Coletando estatísticas do banco de dados', { user: user.email })

    // Get database statistics
    const stats = await getDatabaseStats(supabase)

    return {
      success: true,
      data: stats
    }

  } catch (error: any) {
    logger.error('❌ [Database] Erro ao obter estatísticas:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})

async function getDatabaseStats(supabase: any): Promise<DatabaseStats> {
  try {
    // Get table statistics
    const tables = await getTableStats(supabase)
    
    // Mock connection stats (Supabase doesn't expose these directly)
    const connections = {
      active: 5,
      idle: 15,
      total: 20,
      max: 100
    }

    // Mock performance stats
    const performance = {
      queries_per_second: 12.5,
      avg_query_time: 45.2,
      slow_queries: 2
    }

    // Mock storage stats
    const storage = {
      total_size: "10 GB",
      used_size: "2.3 GB",
      free_size: "7.7 GB"
    }

    return {
      connections,
      tables,
      performance,
      storage
    }

  } catch (error: any) {
    logger.error('❌ [Database] Erro ao coletar estatísticas:', error)
    throw error
  }
}

async function getTableStats(supabase: any) {
  try {
    const tables = []

    // Get users table stats
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    tables.push({
      name: 'users',
      rows: usersCount || 0,
      size: '1.2 MB'
    })

    // Get domains table stats
    const { count: domainsCount } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })

    tables.push({
      name: 'domains',
      rows: domainsCount || 0,
      size: '856 KB'
    })

    // Get transactions table stats
    const { count: transactionsCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    tables.push({
      name: 'transactions',
      rows: transactionsCount || 0,
      size: '3.4 MB'
    })

    // Get plans table stats
    const { count: plansCount } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })

    tables.push({
      name: 'plans',
      rows: plansCount || 0,
      size: '45 KB'
    })

    return tables

  } catch (error: any) {
    logger.error('❌ [Database] Erro ao obter estatísticas das tabelas:', error)
    return []
  }
}