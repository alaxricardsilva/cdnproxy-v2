import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { toSaoPauloISOString } from '~/utils/timezone'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')
    
    logger.info('✅ Autenticação bem-sucedida para SUPERADMIN:', user.id)

    // Parâmetros de consulta
    const query = getQuery(event)
    const period = query.period as string || '30d' // 30d, 7d, 24h

    // Calcular datas baseadas no período
    const now = new Date()
    let startDate: Date

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    logger.info(`🔍 Buscando dados de tráfego para o período: ${period}`)
    logger.info(`📅 Data de início: ${startDate.toISOString()}`)
    logger.info(`📅 Data atual: ${now.toISOString()}`)

    // Buscar dados reais de access_logs
    const { data: accessLogs, error: logsError } = await supabase
      .from('access_logs')
      .select('bytes_transferred, created_at, status_code, domain')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (logsError) {
      logger.error('❌ Erro ao buscar access_logs:', logsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar dados de tráfego'
      })
    }

    logger.info(`✅ Access logs encontrados: ${accessLogs?.length || 0} registros`)

    // Calcular métricas de tráfego
    const totalRequests = accessLogs?.length || 0
    const totalBandwidthBytes = accessLogs?.reduce((sum: number, log: any) => sum + (log.bytes_transferred || 0), 0) || 0
    const totalBandwidthMB = totalBandwidthBytes / (1024 * 1024)
    
    // Para download e upload, vamos usar bytes_transferred como base
    // Valores positivos = download, valores negativos = upload
    const totalDownloadBytes = accessLogs?.reduce((sum: number, log: any) => {
      const bytes = log.bytes_transferred || 0
      return sum + (bytes > 0 ? bytes : 0)
    }, 0) || 0
    
    const totalUploadBytes = accessLogs?.reduce((sum: number, log: any) => {
      const bytes = log.bytes_transferred || 0
      return sum + (bytes < 0 ? Math.abs(bytes) : 0)
    }, 0) || 0
    
    const totalDownloadMB = totalDownloadBytes / (1024 * 1024)
    const totalUploadMB = totalUploadBytes / (1024 * 1024)

    logger.info(`📊 Métricas calculadas:`)
    logger.info(`   - Total Requests: ${totalRequests.toLocaleString()}`)
    logger.info(`   - Total Bandwidth: ${totalBandwidthMB.toFixed(2)} MB`)
    logger.info(`   - Total Download: ${totalDownloadMB.toFixed(2)} MB`)
    logger.info(`   - Total Upload: ${totalUploadMB.toFixed(2)} MB`)

    // Logs sem dados de bytes
    const logsWithoutBytes = accessLogs?.filter((log: any) => !log.bytes_transferred || log.bytes_transferred === 0) || []
    logger.info(`🔍 Logs sem bytes_transferred: ${logsWithoutBytes.length}/${totalRequests}`)

    // Calcular dados históricos para gráfico (últimos dias do período)
    const historicalData: any[] = []
    const daysInPeriod = Math.min(30, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)))
    
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      
      const dayLogs = accessLogs?.filter((log: any) => {
        const logDate = new Date(log.created_at)
        return logDate >= dayStart && logDate < dayEnd
      }) || []
      
      const dayBandwidthBytes = dayLogs.reduce((sum: number, log: any) => sum + (log.bytes_transferred || 0), 0)
      const dayBandwidthMB = dayBandwidthBytes / (1024 * 1024)
      
      historicalData.push({
        date: dayStart.toISOString().split('T')[0],
        download: Math.round(dayBandwidthMB * 0.9 * 100) / 100,
        upload: Math.round(dayBandwidthMB * 0.1 * 100) / 100,
        total: Math.round(dayBandwidthMB * 100) / 100,
        requests: dayLogs.length
      })
    }

    // Calcular crescimento comparando com período anterior
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
    const { data: previousLogs } = await supabase
      .from('access_logs')
      .select('bytes_transferred')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())

    const previousTotalBytes = previousLogs?.reduce((sum, log) => sum + (log.bytes_transferred || 0), 0) || 0
    const previousTotalMB = previousTotalBytes / (1024 * 1024)
    const growthPercentage = previousTotalMB > 0 ? ((totalBandwidthMB - previousTotalMB) / previousTotalMB * 100) : 0

    const result = {
      success: true,
      data: {
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        // Dados principais para o frontend
        totalDownload: Math.round(totalDownloadMB * 100) / 100,
        totalUpload: Math.round(totalUploadMB * 100) / 100,
        totalBandwidth: Math.round(totalBandwidthMB * 100) / 100,
        totalRequests: totalRequests,
        
        // Dados detalhados
        traffic: {
          download: Math.round(totalDownloadMB * 100) / 100,
          upload: Math.round(totalUploadMB * 100) / 100,
          total: Math.round(totalBandwidthMB * 100) / 100,
          requests: totalRequests,
          growth: Math.round(growthPercentage * 100) / 100
        },
        historical: historicalData,
        summary: {
          avgDailyTraffic: Math.round((totalBandwidthMB / Math.max(1, daysInPeriod)) * 100) / 100,
          avgDailyRequests: Math.round(totalRequests / Math.max(1, daysInPeriod)),
          peakDay: historicalData.length > 0 ? 
            historicalData.reduce((max: any, day: any) => day.total > max.total ? day : max, historicalData[0]) : 
            { date: '', total: 0 },
          logsWithData: totalRequests - logsWithoutBytes.length,
          logsWithoutData: logsWithoutBytes.length
        }
      }
    }

    logger.info('🎯 Resultado final da API:')
    logger.info(`   - Total Download: ${result.data.totalDownload} MB`)
    logger.info(`   - Total Upload: ${result.data.totalUpload} MB`)
    logger.info(`   - Total Bandwidth: ${result.data.totalBandwidth} MB`)
    logger.info(`   - Total Requests: ${result.data.totalRequests}`)

    return result

  } catch (error: any) {
    logger.error('❌ Erro ao buscar dados de tráfego:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})