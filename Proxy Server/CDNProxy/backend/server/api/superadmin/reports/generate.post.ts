import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)
    
    // Check if user has superadmin privileges
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

    // Get request body
    const body = await readBody(event)
    const { type, period, format } = body

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '24h':
        startDate.setHours(endDate.getHours() - 24)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    // Generate report based on type
    let reportData = {}
    let reportTitle = ''
    
    switch (type) {
      case 'users':
        reportTitle = 'Relatório de Usuários'
        const { data: users } = await supabase
          .from('users')
          .select('id, email, role, created_at, last_sign_in_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
        
        reportData = {
          totalUsers: users?.length || 0,
          newUsers: users?.length || 0,
          usersByRole: users?.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1
            return acc
          }, {}) || {},
          users: users || []
        }
        break
        
      case 'domains':
        reportTitle = 'Relatório de Domínios'
        const { data: domains } = await supabase
          .from('domains')
          .select('id, domain, active, created_at, user_id')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
        
        reportData = {
          totalDomains: domains?.length || 0,
          activeDomains: domains?.filter(d => d.active).length || 0,
          inactiveDomains: domains?.filter(d => !d.active).length || 0,
          domains: domains || []
        }
        break
        
      case 'analytics':
        reportTitle = 'Relatório de Analytics'
        // Try to get analytics data
        const { data: analytics } = await supabase
          .from('analytics')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        
        reportData = {
          totalPageViews: analytics?.length || 0,
          uniqueUsers: analytics ? new Set(analytics.map(a => a.user_id || a.session_id)).size : 0,
          topPages: analytics?.reduce((acc, a) => {
            const page = a.page_url || '/'
            acc[page] = (acc[page] || 0) + 1
            return acc
          }, {}) || {},
          analytics: analytics || []
        }
        break
        
      case 'security':
        reportTitle = 'Relatório de Segurança'
        // Try to get security logs
        const { data: securityLogs } = await supabase
          .from('auth_logs')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        
        reportData = {
          totalEvents: securityLogs?.length || 0,
          loginAttempts: securityLogs?.filter(l => l.event_type === 'login').length || 0,
          failedLogins: securityLogs?.filter(l => l.event_type === 'login_failed').length || 0,
          securityLogs: securityLogs || []
        }
        break
        
      default:
        reportTitle = 'Relatório Geral'
        // Get overview data
        const [usersOverview, domainsOverview] = await Promise.all([
          supabase.from('users').select('id, role, created_at').gte('created_at', startDate.toISOString()),
          supabase.from('domains').select('id, active, created_at').gte('created_at', startDate.toISOString())
        ])
        
        reportData = {
          summary: {
            totalUsers: usersOverview.data?.length || 0,
            totalDomains: domainsOverview.data?.length || 0,
            activeDomains: domainsOverview.data?.filter(d => d.active).length || 0
          },
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }
    }

    // Create report record
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const report = {
      id: reportId,
      title: reportTitle,
      type: type || 'overview',
      period,
      format: format || 'json',
      status: 'completed',
      data: reportData,
      generated_by: user.id,
      generated_at: new Date().toISOString(),
      file_size: JSON.stringify(reportData).length
    }

    // Try to save report to database
    try {
      await supabase
        .from('reports')
        .insert(report)
    } catch (dbError) {
      console.warn('Could not save report to database:', dbError)
      // Continue without saving to database
    }

    return {
      success: true,
      data: {
        report: {
          id: report.id,
          title: report.title,
          type: report.type,
          period: report.period,
          format: report.format,
          status: report.status,
          generated_at: report.generated_at,
          file_size: report.file_size
        }
      },
      message: 'Relatório gerado com sucesso'
    }

  } catch (error) {
    logger.error('Erro ao gerar relatório:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor ao gerar relatório'
    })
  }
})