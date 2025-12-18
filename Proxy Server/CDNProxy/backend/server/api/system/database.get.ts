import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate and get admin user
    const { user, userProfile, supabase: supabaseAdmin } = await requireAdminAuth(event)
    
    logger.info('Database API - Authenticated user:', user.id, 'Role:', userProfile.role)

    // Get database statistics
    const tables = ['profiles', 'domains', 'analytics', 'access_logs', 'plans']
    const tableStats: any[] = []

    for (const table of tables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (!error) {
          // Get recent activity (last 24 hours)
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)

          let recentCount = 0
          if (table === 'analytics' || table === 'access_logs') {
            const { count: recent } = await supabaseAdmin
              .from(table)
              .select('*', { count: 'exact', head: true })
              .gte('created_at', yesterday.toISOString())
            recentCount = recent || 0
          } else {
            const { count: recent } = await supabaseAdmin
              .from(table)
              .select('*', { count: 'exact', head: true })
              .gte('created_at', yesterday.toISOString())
            recentCount = recent || 0
          }

          tableStats.push({
            table,
            totalRecords: count || 0,
            recentRecords: recentCount,
            status: 'healthy'
          })
        } else {
          tableStats.push({
            table,
            totalRecords: 0,
            recentRecords: 0,
            status: 'error',
            error: error.message
          })
        }
      } catch (err: any) {
        tableStats.push({
          table,
          totalRecords: 0,
          recentRecords: 0,
          status: 'error',
          error: 'Connection failed'
        })
      }
    }

    // Test database connection speed
    const connectionTests: number[] = []
    for (let i = 0; i < 3; i++) {
      const start = Date.now()
      try {
        await supabaseAdmin.from('profiles').select('id').limit(1)
        connectionTests.push(Date.now() - start)
      } catch (error) {
        connectionTests.push(-1)
      }
    }

    const avgResponseTime = connectionTests
      .filter(time => time > 0)
      .reduce((sum, time) => sum + time, 0) / connectionTests.filter(time => time > 0).length

    // Calculate database health score
    const healthyTables = tableStats.filter(t => t.status === 'healthy').length
    const healthScore = (healthyTables / tables.length) * 100

    // Calculate total size estimate
    const totalSize = tableStats.reduce((sum, table) => sum + (table.totalRecords * 1024), 0)

    const databaseInfo = {
      status: healthScore === 100 ? 'Online' : healthScore > 50 ? 'Warning' : 'Critical',
      healthScore,
      responseTime: avgResponseTime || 0,
      tables: tableStats,
      totalSize,
      connectionTests,
      totalRecords: tableStats.reduce((sum, table) => sum + table.totalRecords, 0),
      recentActivity: tableStats.reduce((sum, table) => sum + table.recentRecords, 0),
      timestamp: toSaoPauloISOString(new Date())
    }

    return {
      success: true,
      data: databaseInfo
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})