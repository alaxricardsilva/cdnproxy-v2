import { defineEventHandler, createError } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'
import { logger } from '../../../utils/logger'

// Função auxiliar para formatar bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`
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

    logger.info('🔍 [TABLE-SIZES] Buscando tamanhos das tabelas...')

    // Contar registros manualmente das tabelas principais (método compatível com Supabase)
    const mainTables = [
      'access_logs',
      'analytics_data', 
      'domains',
      'users',
      'transactions',
      'hls_metrics',
      'streaming_metrics',
      'domain_analytics',
      'geolocation_cache',
      'notifications',
      'plans',
      'system_logs',
      'ip_geo_cache'
    ]

    const tableStats = await Promise.all(
      mainTables.map(async (tableName) => {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })

          // Estimar tamanho baseado no número de registros (aproximação)
          const estimatedSizeBytes = (count || 0) * 1024 // 1KB por registro (estimativa)
          const sizePretty = formatBytes(estimatedSizeBytes)

          return {
            table_name: tableName,
            row_count: error ? 0 : (count || 0),
            size_pretty: sizePretty,
            size_bytes: estimatedSizeBytes,
            error: error ? error.message : null
          }
        } catch (error: any) {
          return {
            table_name: tableName,
            row_count: 0,
            size_pretty: 'N/A',
            size_bytes: 0,
            error: error.message
          }
        }
      })
    )

    // Ordenar por número de registros (decrescente)
    const tablesData = tableStats
      .filter(table => table.row_count > 0) // Mostrar apenas tabelas com dados
      .sort((a, b) => b.row_count - a.row_count)

    logger.info('✅ [TABLE-SIZES] Dados obtidos via contagem manual')

    // Calcular estatísticas gerais
    const totalTables = tablesData.length
    const totalRows = tablesData.reduce((sum, table) => sum + table.row_count, 0)
    const tablesWithData = tablesData.filter(table => table.row_count > 0).length
    const emptyTables = tablesData.filter(table => table.row_count === 0).length

    // Calcular tamanho total do banco de dados (estimativa baseada nas tabelas)
    const totalSizeBytes = tablesData.reduce((sum, table) => sum + table.size_bytes, 0)
    const totalSizePretty = formatBytes(totalSizeBytes)

    const result = {
      success: true,
      data: {
        tables: tablesData,
        statistics: {
          total_tables: totalTables,
          tables_with_data: tablesWithData,
          empty_tables: emptyTables,
          total_rows: totalRows,
          total_size_bytes: totalSizeBytes,
          total_size_pretty: totalSizePretty
        },
        metadata: {
          generated_at: new Date().toISOString(),
          method: tablesData.length > 0 ? 'database_query' : 'manual_count'
        }
      }
    }

    logger.info(`✅ [TABLE-SIZES] Retornando ${totalTables} tabelas, ${totalRows} registros total`)
    return result

  } catch (error: any) {
    logger.error('❌ [TABLE-SIZES] Erro:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: `Erro ao obter tamanhos das tabelas: ${error.message}`
    })
  }
})