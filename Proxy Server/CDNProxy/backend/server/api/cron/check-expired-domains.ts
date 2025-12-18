import { logger } from '~/utils/logger'
import { defineEventHandler, createError } from 'h3'
import { supabaseAdmin } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [CRON EXPIRED DOMAINS] Iniciando verificação de domínios expirados...')
    
    // Usar o cliente admin já configurado
    const supabase = supabaseAdmin
    const now = new Date().toISOString()
    
    // Buscar domínios expirados que ainda estão ativos
    const { data: expiredDomains, error: fetchError } = await supabase
      .from('domains')
      .select(`
        id,
        domain,
        expires_at,
        status,
        user_id,
        users!inner(
          id,
          email,
          name
        )
      `)
      .lt('expires_at', now)
      .eq('status', 'active')
    
    if (fetchError) {
      logger.error('❌ [CRON EXPIRED DOMAINS] Erro ao buscar domínios expirados:', fetchError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao buscar domínios expirados: ${fetchError.message}`
      })
    }
    
    if (!expiredDomains || expiredDomains.length === 0) {
      logger.info('✅ [CRON EXPIRED DOMAINS] Nenhum domínio expirado encontrado')
      return {
        success: true,
        message: 'Nenhum domínio expirado encontrado',
        processed: 0
      }
    }
    
    logger.info(`🔄 [CRON EXPIRED DOMAINS] Encontrados ${expiredDomains.length} domínios expirados`)
    
    // Desativar domínios expirados
    const domainIds = expiredDomains.map(d => d.id)
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        status: 'expired',
        updated_at: now
      })
      .in('id', domainIds)
    
    if (updateError) {
      logger.error('❌ [CRON EXPIRED DOMAINS] Erro ao desativar domínios:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: `Erro ao desativar domínios: ${updateError.message}`
      })
    }
    
    // Log dos domínios processados
    for (const domain of expiredDomains) {
      logger.info(`🔄 [CRON EXPIRED DOMAINS] Domínio desativado: ${domain.domain} (usuário: ${(domain.users as any).email})`)
    }
    
    logger.info(`✅ [CRON EXPIRED DOMAINS] ${expiredDomains.length} domínios desativados com sucesso`)
    
    return {
      success: true,
      message: `${expiredDomains.length} domínios expirados foram desativados`,
      processed: expiredDomains.length,
      domains: expiredDomains.map(d => ({
        id: d.id,
        domain: d.domain,
        expires_at: d.expires_at,
        user_email: (d.users as any).email
      }))
    }
    
  } catch (error: any) {
    logger.error('💥 [CRON EXPIRED DOMAINS] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})