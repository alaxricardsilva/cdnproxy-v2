import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { getMercadoPagoClient } from '~/utils/mercadopago-client'
import { supabaseAdmin } from '~/utils/hybrid-auth'
import { notifyPaymentApproved, notifyPaymentFailed } from '~/utils/notification-helper'

export default defineEventHandler(async (event) => {
  try {
    // Usar cliente Supabase admin do sistema híbrido
    const supabase = supabaseAdmin
    
    // Ler dados do webhook
    const body = await readBody(event)
    const signature = getHeader(event, 'x-signature') || ''

    logger.info('MercadoPago Webhook received:', body)

    // Validar se é uma notificação de pagamento
    if (!body.data || !body.data.id || body.type !== 'payment') {
      return {
        success: true,
        message: 'Notification ignored - not a payment notification'
      }
    }

    const paymentId = body.data.id
    const topic = body.type

    // Obter cliente MercadoPago
    const mpClient = await getMercadoPagoClient()
    
    if (!mpClient) {
      throw createError({
        statusCode: 503,
        statusMessage: 'MercadoPago não configurado'
      })
    }

    // Processar notificação
    const paymentData = await mpClient.processWebhookNotification(paymentId, topic)
    
    if (!paymentData) {
      return {
        success: true,
        message: 'Notification processed but no payment data returned'
      }
    }

    // Buscar transação no banco
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('gateway_transaction_id', paymentId.toString())
      .eq('gateway', 'mercadopago')
      .single()

    if (transactionError || !transaction) {
      logger.error('Transação não encontrada:', paymentId)
      return {
        success: false,
        message: 'Transaction not found'
      }
    }

    // Mapear status do MercadoPago para nosso sistema
    let newStatus = 'pending'
    let shouldActivatePlan = false

    switch (paymentData.status) {
      case 'approved':
        newStatus = 'completed'
        shouldActivatePlan = true
        break
      case 'rejected':
      case 'cancelled':
        newStatus = 'failed'
        break
      case 'refunded':
      case 'charged_back':
        newStatus = 'refunded'
        break
      case 'in_process':
      case 'in_mediation':
      case 'pending':
        newStatus = 'pending'
        break
      default:
        newStatus = 'pending'
    }

    // Atualizar transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        gateway_response: paymentData,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)

    if (updateError) {
      logger.error('Erro ao atualizar transação:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao atualizar transação'
      })
    }

    // Se o pagamento foi aprovado, ativar o plano do usuário
    if (shouldActivatePlan) {
      try {
        // Buscar dados do plano
        const { data: planData } = await supabase
          .from('plans')
          .select('*')
          .eq('id', transaction.plan_id)
          .single()

        if (planData) {
          // Calcular data de expiração baseada no plano
          const expirationDate = new Date()
          
          switch (planData.billing_cycle) {
            case 'monthly':
              expirationDate.setMonth(expirationDate.getMonth() + 1)
              break
            case 'quarterly':
              expirationDate.setMonth(expirationDate.getMonth() + 3)
              break
            case 'yearly':
              expirationDate.setFullYear(expirationDate.getFullYear() + 1)
              break
            default:
              expirationDate.setMonth(expirationDate.getMonth() + 1)
          }

          // Atualizar usuário com o novo plano
          await supabase
            .from('users')
            .update({
              plan_id: transaction.plan_id,
              plan_expires_at: expirationDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.user_id)

          // Registrar ativação do plano
          await supabase
            .from('user_plan_history')
            .insert({
              user_id: transaction.user_id,
              plan_id: transaction.plan_id,
              transaction_id: transaction.id,
              activated_at: new Date().toISOString(),
              expires_at: expirationDate.toISOString(),
              status: 'active'
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
            gateway: 'mercadopago',
            plan_name: planData.name,
            user_email: userData?.email,
            user_domain: userData?.domains?.[0]?.domain
          })
        }
      } catch (planError) {
        logger.error('Erro ao ativar plano:', planError)
        // Não falhar o webhook por causa disso, apenas logar
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
        gateway: 'mercadopago',
        reason: paymentData.status_detail || 'Pagamento rejeitado',
        user_email: userData?.email,
        user_domain: userData?.domains?.[0]?.domain
      })
    }

    // Log da atividade
    await supabase
      .from('webhook_logs')
      .insert({
        provider: 'mercadopago',
        event_type: 'payment.notification',
        payload: body,
        transaction_id: transaction.id,
        status: newStatus,
        processed_at: new Date().toISOString()
      })

    return {
      success: true,
      message: 'Webhook processed successfully',
      transactionId: transaction.id,
      status: newStatus
    }

  } catch (error: any) {
    logger.error('Erro ao processar webhook MercadoPago:', error)
    
    // Log do erro
    try {
      // Usar cliente Supabase admin para o bloco catch
      const supabase = supabaseAdmin
      
      await supabase
        .from('webhook_logs')
        .insert({
          provider: 'mercadopago',
          event_type: 'payment.notification',
          payload: await readBody(event),
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
    } catch (logError) {
      logger.error('Erro ao salvar log do webhook:', logError)
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})