import { logger } from '~/utils/logger'
import { requireAdminAuth } from '~/utils/hybrid-auth'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { id, filename, token } = query

    // Se token for fornecido via query parameter, usar para autenticação
    let authResult
    if (token) {
      // Verificar token via Supabase
      const config = useRuntimeConfig()
      const supabase = createClient(
        config.public.supabaseUrl,
        config.supabaseServiceKey
      )
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token as string)
      
      if (authError || !user) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Token inválido'
        })
      }
      
      authResult = { user }
    } else {
      // Usar autenticação padrão
      authResult = await requireAdminAuth(event)
      
      if (!authResult) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized'
        })
      }
    }

    // Verificar se é superadmin
    if (authResult.user.role !== 'superadmin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Superadmin access required'
      })
    }

    if (!id && !filename) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID ou filename do backup é obrigatório'
      })
    }

    // Buscar backup no banco de dados
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceKey
    )

    let backupQuery = supabase
      .from('backups')
      .select('*')

    if (id) {
      backupQuery = backupQuery.eq('id', id)
    } else if (filename) {
      backupQuery = backupQuery.eq('filename', filename)
    }

    const { data: backups, error: backupError } = await backupQuery.single()

    if (backupError || !backups) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Backup não encontrado'
      })
    }

    const backup = backups

    if (!backup) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Backup não encontrado'
      })
    }

    // Log da ação de download
    logger.info(`Backup download requested: ${backup.filename} by ${authResult.user.email}`)

    // Configurar headers para download
    setHeader(event, 'Content-Type', 'application/octet-stream')
    setHeader(event, 'Content-Disposition', `attachment; filename="${backup.filename}.gz"`)
    setHeader(event, 'Content-Length', backup.size)
    setHeader(event, 'Cache-Control', 'no-cache')

    // Em implementação real, retornar o stream do arquivo
    // Por enquanto, retornar erro indicando que o arquivo não está disponível
    throw createError({
      statusCode: 501,
      statusMessage: 'Download de backup não implementado'
    })

  } catch (error: any) {
    logger.error('Erro ao fazer download do backup:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})