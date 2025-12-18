import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, getHeader, sendRedirect } from 'h3'
import { supabaseAdmin } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔍 [DOMAIN STATUS] Iniciando verificação de status...')
    
    // Obter domínio da URL
    const domain = getRouterParam(event, 'domain')
    if (!domain) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Domínio é obrigatório'
      })
    }
    
    logger.info('🌐 [DOMAIN STATUS] Verificando domínio:', domain)
    
    // Usar o cliente admin já configurado
    const supabase = supabaseAdmin
    
    // Buscar informações do domínio
    const { data: domainData, error: domainError } = await supabase
      .from('domains')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          company
        ),
        plans(
          id,
          name,
          description,
          max_domains,
          max_bandwidth_gb,
          price,
          duration_value,
          duration_type
        )
      `)
      .eq('domain', domain.toLowerCase())
      .single()
    
    if (domainError || !domainData) {
      logger.error('❌ [DOMAIN STATUS] Domínio não encontrado:', domainError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Domínio não encontrado'
      })
    }
    
    // Verificar User-Agent para detectar aplicativo/smartTV
    const userAgent = getHeader(event, 'user-agent') || ''
    const isApp = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isSmartTV = /SmartTV|Tizen|WebOS|NetCast|BRAVIA|GoogleTV|AppleTV|Roku|Xbox|PlayStation/i.test(userAgent)
    const isBot = /bot|crawler|spider|crawling/i.test(userAgent)
    
    logger.info('📱 [DOMAIN STATUS] User-Agent detectado:', {
      userAgent: userAgent.substring(0, 100),
      isApp,
      isSmartTV,
      isBot
    })
    
    // Verificar status do domínio
    const now = new Date()
    const expiresAt = domainData.expires_at ? new Date(domainData.expires_at) : null
    const isExpired = expiresAt && expiresAt < now
    const isActive = domainData.status === 'active' && !isExpired
    
    // Se for app/smartTV e domínio ativo, redirecionar
    if ((isApp || isSmartTV) && isActive && !isBot) {
      if (domainData.redirect_301 && domainData.target_url) {
        logger.info('🔄 [DOMAIN STATUS] Redirecionamento 301 para app/smartTV:', domainData.target_url)
        
        // Registrar acesso se analytics habilitado
        if (domainData.analytics_enabled) {
          try {
            await supabase
              .from('domain_analytics')
              .insert({
                domain_id: domainData.id,
                ip_address: getClientIP(event),
                user_agent: userAgent.substring(0, 500),
                referer: getHeader(event, 'referer') || null,
                device_type: isSmartTV ? 'smarttv' : 'mobile',
                accessed_at: new Date().toISOString()
              })
          } catch (err: any) {
            logger.error('⚠️ [DOMAIN STATUS] Erro ao registrar analytics:', err)
          }
        }
        
        // Retornar redirecionamento
        return sendRedirect(event, domainData.target_url, 301)
      } else if (domainData.target_url) {
        logger.info('🔄 [DOMAIN STATUS] Redirecionamento para app/smartTV:', domainData.target_url)
        
        // Registrar acesso se analytics habilitado
        if (domainData.analytics_enabled) {
          try {
            await supabase
              .from('domain_analytics')
              .insert({
                domain_id: domainData.id,
                ip_address: getClientIP(event),
                user_agent: userAgent.substring(0, 500),
                referer: getHeader(event, 'referer') || null,
                device_type: isSmartTV ? 'smarttv' : 'mobile',
                accessed_at: new Date().toISOString()
              })
          } catch (err: any) {
            logger.error('⚠️ [DOMAIN STATUS] Erro ao registrar analytics:', err)
          }
        }
        
        // Retornar redirecionamento
        return sendRedirect(event, domainData.target_url, 302)
      }
    }
    
    // Registrar acesso se analytics habilitado
    if (domainData.analytics_enabled && !isBot) {
      try {
        await supabase
          .from('domain_analytics')
          .insert({
            domain_id: domainData.id,
            ip_address: getClientIP(event),
            user_agent: userAgent.substring(0, 500),
            referer: getHeader(event, 'referer') || null,
            device_type: isSmartTV ? 'smarttv' : (isApp ? 'mobile' : 'desktop'),
            accessed_at: new Date().toISOString()
          })
      } catch (err: any) {
        logger.error('⚠️ [DOMAIN STATUS] Erro ao registrar analytics:', err)
      }
    }
    
    // Retornar página de status
    const statusInfo = {
      domain: domainData.domain,
      status: domainData.status,
      isActive,
      isExpired,
      expiresAt: domainData.expires_at,
      sslEnabled: domainData.ssl_enabled,
      analyticsEnabled: domainData.analytics_enabled,
      redirect301: domainData.redirect_301,
      targetUrl: domainData.target_url,
      owner: {
        name: domainData.users.name,
        company: domainData.users.company || null
      },
      plan: domainData.plans ? {
        name: domainData.plans.name,
        description: domainData.plans.description
      } : null,
      lastUpdated: domainData.updated_at,
      createdAt: domainData.created_at
    }
    
    logger.info('✅ [DOMAIN STATUS] Retornando status do domínio')
    
    return {
      success: true,
      data: statusInfo
    }
    
  } catch (error: any) {
    logger.error('💥 [DOMAIN STATUS] Erro geral:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Erro interno do servidor: ${error.message}`
    })
  }
})

// Função auxiliar para obter IP do cliente
function getClientIP(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  const realIP = getHeader(event, 'x-real-ip')
  const remoteAddr = event.node.req.socket?.remoteAddress
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || remoteAddr || 'unknown'
}