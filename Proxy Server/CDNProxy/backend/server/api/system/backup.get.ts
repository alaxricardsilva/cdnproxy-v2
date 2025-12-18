import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, createError, getQuery, getHeader } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate admin and get Supabase client
    const { user, supabase } = await requireAdminAuth(event)

    // Get query parameters
    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = Math.min(parseInt(query.limit as string) || 20, 50)

    // Buscar backups reais do banco de dados
    const { data: backups, error } = await supabase
      .from('system_backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      logger.error('Erro ao buscar backups:', error)
      return {
        success: false,
        error: 'Erro ao buscar backups do sistema'
      }
    }

    // Se não há backups reais, retornar lista vazia
    const backupList = backups || []

    // Contar total de backups para paginação
    const { count: totalBackups } = await supabase
      .from('system_backups')
      .select('*', { count: 'exact', head: true })

    // Calcular estatísticas dos backups reais
    const totalSize = backupList.reduce((sum, backup) => sum + (backup.size || 0), 0)
    const completedBackups = backupList.filter(b => b.status === 'completed').length
    const failedBackups = backupList.filter(b => b.status === 'failed').length

    // Configurações de backup (podem vir do banco ou configuração)
    const backupSchedule = {
      enabled: true,
      frequency: 'daily',
      time: '00:00',
      retention: 30,
      compression: true,
      encryption: false,
      nextBackup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    // Informações de armazenamento (podem vir do sistema de arquivos)
    const storageInfo = {
      provider: 'local',
      totalSpace: 107374182400, // 100GB - pode ser obtido dinamicamente
      usedSpace: totalSize,
      availableSpace: 107374182400 - totalSize,
      location: '/backups'
    }

    return {
      success: true,
      data: {
        backups: backupList,
        pagination: {
          page,
          limit,
          total: totalBackups || 0,
          totalPages: Math.ceil((totalBackups || 0) / limit)
        },
        statistics: {
          total: totalBackups || 0,
          completed: completedBackups,
          failed: failedBackups,
          totalSize,
          averageSize: backupList.length > 0 ? Math.round(totalSize / backupList.length) : 0
        },
        schedule: backupSchedule,
        storage: storageInfo
      }
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