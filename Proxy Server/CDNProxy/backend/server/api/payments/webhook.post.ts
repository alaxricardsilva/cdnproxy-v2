import { logger } from '~/utils/logger'
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getPagBankClient } from '../../../utils/pagbank-client'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    // Conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Obter cliente PagBank
    const pagBankClient = await getPagBankClient()
    if (!pagBankClient) {
      throw createError({
        statusCode: 500,
        statusMessage: 'PagBank não configurado'
      })
    }

    // Validar webhook (verificar se veio do PagBank)
    const isValid = await pagBankClient.validateWebhook(body, getHeader(event, 'x-pagbank-signature') || '')
    if (!isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Webhook inválido'
      })
    }

    // Processar notificação
    const { id: paymentId, status } = body

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do pagamento não fornecido'
      })
    }

    // Buscar transação no banco de dados
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_id', paymentId)
      .single()

    if (transactionError || !transaction) {
      logger.error('Transação não encontrada:', paymentId)
      return { success: true, message: 'Transação não encontrada' }
    }

    // Mapear status do PagBank para nosso sistema
    let newStatus = 'pending'
    switch (status) {
      case 'PAID':
        newStatus = 'completed'
        break
      case 'DECLINED':
      case 'CANCELED':
        newStatus = 'failed'
        break
      case 'WAITING':
      case 'IN_ANALYSIS':
        newStatus = 'pending'
        break
      default:
        newStatus = 'pending'
    }

    // Atualizar status da transação
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        webhook_data: body
      })
      .eq('id', transaction.id)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao atualizar transação'
      })
    }

    // Se o pagamento foi aprovado, ativar o plano do usuário
    if (newStatus === 'completed') {
      const planDuration = transaction.billing_cycle === 'yearly' ? 365 : 30
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + planDuration)

      // Atualizar plano do usuário
      const { error: userPlanError } = await supabase
        .from('user_plans')
        .upsert({
          user_id: transaction.user_id,
          plan_id: transaction.plan_id,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
          updated_at: new Date().toISOString()
        })

      if (userPlanError) {
        logger.error('Erro ao ativar plano do usuário:', userPlanError)
      }

      // Atualizar status do usuário para ativo se necessário
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.user_id)

      if (userUpdateError) {
        logger.error('Erro ao atualizar status do usuário:', userUpdateError)
      }
    }

    return {
      success: true,
      message: 'Webhook processado com sucesso'
    }

  } catch (error: any) {
    logger.error('Erro no webhook:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})