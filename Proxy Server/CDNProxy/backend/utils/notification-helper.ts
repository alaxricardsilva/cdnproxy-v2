import { logger } from '~/utils/logger'
import { supabaseAdmin } from './hybrid-auth'

export interface NotificationData {
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  action_url?: string
  metadata?: Record<string, any>
}

/**
 * Envia notificação para o SUPERADMIN
 */
export async function sendSuperAdminNotification(data: NotificationData) {
  try {
    logger.info('📧 [NOTIFICATION] Enviando notificação para SUPERADMIN:', data.title)

    // Buscar todos os usuários com role SUPERADMIN
    const { data: superAdmins, error: superAdminError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('role', 'SUPERADMIN')
      .eq('status', 'active')

    if (superAdminError) {
      logger.error('❌ [NOTIFICATION] Erro ao buscar superadmins:', superAdminError)
      return false
    }

    if (!superAdmins || superAdmins.length === 0) {
      logger.info('⚠️ [NOTIFICATION] Nenhum superadmin encontrado')
      return false
    }

    // Criar notificação para cada superadmin
    const notifications = superAdmins.map(superAdmin => ({
      user_id: superAdmin.id,
      title: data.title,
      message: data.message,
      type: data.type,
      action_url: data.action_url || null,
      metadata: data.metadata || null,
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      logger.error('❌ [NOTIFICATION] Erro ao inserir notificações:', insertError)
      return false
    }

    logger.info(`✅ [NOTIFICATION] ${notifications.length} notificações enviadas para superadmins`)
    return true

  } catch (error: any) {
    logger.error('❌ [NOTIFICATION] Erro geral:', error.message)
    return false
  }
}

/**
 * Envia notificação de pagamento aprovado para SUPERADMIN
 */
export async function notifyPaymentApproved(transactionData: {
  id: string
  user_id: string
  amount: number
  gateway: string
  plan_name?: string
  user_email?: string
  user_domain?: string
}) {
  const { id, user_id, amount, gateway, plan_name, user_email, user_domain } = transactionData

  // Buscar dados do usuário se não fornecidos
  let userInfo = { email: user_email, domain: user_domain }
  
  if (!user_email || !user_domain) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, domains(domain)')
      .eq('id', user_id)
      .single()

    if (userData) {
      userInfo.email = userData.email
      userInfo.domain = userData.domains?.[0]?.domain || 'N/A'
    }
  }

  const notification: NotificationData = {
    title: '💰 Pagamento Aprovado',
    message: `Pagamento de R$ ${amount.toFixed(2)} aprovado via ${gateway.toUpperCase()}. Cliente: ${userInfo.email} (${userInfo.domain})${plan_name ? ` - Plano: ${plan_name}` : ''}`,
    type: 'success',
    action_url: `/superadmin/payments?transaction=${id}`,
    metadata: {
      transaction_id: id,
      user_id,
      amount,
      gateway,
      user_email: userInfo.email,
      user_domain: userInfo.domain,
      plan_name
    }
  }

  return await sendSuperAdminNotification(notification)
}

/**
 * Envia notificação de pagamento falhado para SUPERADMIN
 */
export async function notifyPaymentFailed(transactionData: {
  id: string
  user_id: string
  amount: number
  gateway: string
  reason?: string
  user_email?: string
  user_domain?: string
}) {
  const { id, user_id, amount, gateway, reason, user_email, user_domain } = transactionData

  // Buscar dados do usuário se não fornecidos
  let userInfo = { email: user_email, domain: user_domain }
  
  if (!user_email || !user_domain) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, domains(domain)')
      .eq('id', user_id)
      .single()

    if (userData) {
      userInfo.email = userData.email
      userInfo.domain = userData.domains?.[0]?.domain || 'N/A'
    }
  }

  const notification: NotificationData = {
    title: '❌ Pagamento Falhado',
    message: `Pagamento de R$ ${amount.toFixed(2)} falhado via ${gateway.toUpperCase()}. Cliente: ${userInfo.email} (${userInfo.domain})${reason ? ` - Motivo: ${reason}` : ''}`,
    type: 'error',
    action_url: `/superadmin/payments?transaction=${id}`,
    metadata: {
      transaction_id: id,
      user_id,
      amount,
      gateway,
      reason,
      user_email: userInfo.email,
      user_domain: userInfo.domain
    }
  }

  return await sendSuperAdminNotification(notification)
}