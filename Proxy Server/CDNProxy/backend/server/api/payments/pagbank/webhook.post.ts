import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { getPagBankClient } from '../../../../utils/pagbank-client'
import { notifyPaymentApproved, notifyPaymentFailed } from '../../../../utils/notification-helper'

export default defineEventHandler(async (event: any) => {
  try {
    // Ler corpo do webhook
    const body = await readBody(event)
    
    if (!body || !body.notificationCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados do webhook inválidos'
      })
    }

    // Obter cliente PagBank
    const pagBankClient = await getPagBankClient()
    
    if (!pagBankClient) {
      logger.error('PagBank não configurado')
      return { success: false, error: 'PagBank não configurado' }
    }

    // Processar notificação
    let paymentData: any = null
    try {
      paymentData = await pagBankClient.processWebhookNotification(body.notificationCode)
    } catch (error) {
      logger.error('Erro ao processar notificação PagBank:', error)
      return { success: false, error: 'Erro ao processar notificação' }
    }

    if (!paymentData || !paymentData.reference) {
      logger.error('Dados de pagamento inválidos:', paymentData)
      return { success: false, error: 'Dados de pagamento inválidos' }
    }

    // Conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar transação no banco de dados
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('gateway_transaction_id', paymentData.reference)
      .single()

    if (transactionError || !transaction) {
      logger.error('Transação não encontrada:', paymentData.reference)
      return { success: false, error: 'Transação não encontrada' }
    }

    // Mapear status do PagBank para status interno
    let newStatus = 'pending'
    
    switch (paymentData.status) {
      case 'PAID':
        newStatus = 'completed'
        break
      case 'DECLINED':
      case 'CANCELED':
        newStatus = 'failed'
        break
      case 'WAITING':
      default:
        newStatus = 'pending'
    }

    // Atualizar status da transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        gateway_response: paymentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)

    if (updateError) {
      logger.error('Erro ao atualizar transação:', updateError)
      return { success: false, error: 'Erro ao atualizar transação' }
    }

    // Se pagamento foi aprovado, ativar plano do usuário
    if (newStatus === 'completed') {
      try {
        // Buscar dados do plano
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', transaction.plan_id)
          .single()

        if (!planError && planData) {
          // Calcular data de expiração baseada no ciclo de faturamento
          const now = new Date()
          let expiresAt = new Date(now)
          
          switch (planData.billing_cycle) {
            case 'monthly':
              expiresAt.setMonth(expiresAt.getMonth() + 1)
              break
            case 'quarterly':
              expiresAt.setMonth(expiresAt.getMonth() + 3)
              break
            case 'yearly':
              expiresAt.setFullYear(expiresAt.getFullYear() + 1)
              break
            default:
              expiresAt.setMonth(expiresAt.getMonth() + 1) // Default para mensal
          }

          // Atualizar plano do usuário
          await supabase
            .from('user_plans')
            .upsert({
              user_id: transaction.user_id,
              plan_id: transaction.plan_id,
              status: 'active',
              started_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString()
            })

          logger.info(`Plano ativado para usuário ${transaction.user_id}`)

          // Buscar dados do usuário para notificação
          const { data: userData } = await supabase
            .from('users')
            .select('email, domains(domain)')
            .eq('id', transaction.user_id)
            .single()

          // Enviar notificação para SUPERADMIN sobre pagamento aprovado
          await notifyPaymentApproved({
            id: transaction.id,
            user_id: transaction.user_id,
            amount: transaction.amount,
            gateway: 'pagbank',
            plan_name: planData.name,
            user_email: userData?.email,
            user_domain: userData?.domains?.[0]?.domain
          })
        }
      } catch (error) {
        logger.error('Erro ao ativar plano:', error)
        // Não falhar o webhook por causa disso
      }
    } else if (newStatus === 'failed') {
      // Enviar notificação para SUPERADMIN sobre pagamento falhado
      const { data: userData } = await supabase
        .from('users')
        .select('email, domains(domain)')
        .eq('id', transaction.user_id)
        .single()

      await notifyPaymentFailed({
        id: transaction.id,
        user_id: transaction.user_id,
        amount: transaction.amount,
        gateway: 'pagbank',
        reason: paymentData.status || 'Pagamento rejeitado',
        user_email: userData?.email,
        user_domain: userData?.domains?.[0]?.domain
      })
    }

    // Log do webhook
    await supabase
      .from('webhook_logs')
      .insert({
        gateway: 'pagbank',
        event_type: 'payment_notification',
        payload: body,
        processed_at: new Date().toISOString(),
        transaction_id: transaction.id
      })

    return { success: true }

  } catch (error: any) {
    logger.error('Erro no webhook PagBank:', error)
    
    // Log do erro
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      await supabase
        .from('webhook_logs')
        .insert({
          gateway: 'pagbank',
          event_type: 'error',
          payload: { error: error.message, body: await readBody(event) },
          processed_at: new Date().toISOString()
        })
    } catch (logError) {
      logger.error('Erro ao salvar log:', logError)
    }

    return { success: false, error: error.message }
  }
})