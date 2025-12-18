import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { requireUserAuth } from '../../../../../utils/hybrid-auth'
import { getMercadoPagoClient } from '../../../../../utils/mercadopago-client'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação usando sistema híbrido
    const { user, supabase } = await requireUserAuth(event)

    // Obter ID da transação
    const transactionId = getRouterParam(event, 'id')
    
    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da transação é obrigatório'
      })
    }

    // Buscar transação no banco
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id) // Garantir que o usuário só veja suas próprias transações
      .eq('gateway', 'mercadopago')
      .single()

    if (transactionError || !transaction) {
      logger.error('Transação não encontrada:', { transactionId, userId: user.id, error: transactionError })
      throw createError({
        statusCode: 404,
        statusMessage: `Transação com ID '${transactionId}' não foi encontrada ou não pertence ao usuário`
      })
    }

    // Obter cliente MercadoPago
    const mpClient = await getMercadoPagoClient()
    
    if (!mpClient) {
      throw createError({
        statusCode: 503,
        statusMessage: 'MercadoPago não configurado'
      })
    }

    // Consultar status atual no MercadoPago
    let currentPaymentData: any = null
    try {
      currentPaymentData = await mpClient.getPaymentStatus(transaction.gateway_transaction_id)
    } catch (error) {
      logger.error('Erro ao consultar status no MercadoPago:', error)
      // Se não conseguir consultar, usar dados do banco
    }

    // Mapear status para formato amigável
    const statusMap: Record<string, string> = {
      'pending': 'Aguardando pagamento',
      'approved': 'Pagamento aprovado',
      'authorized': 'Pagamento autorizado',
      'in_process': 'Processando pagamento',
      'in_mediation': 'Em mediação',
      'rejected': 'Pagamento rejeitado',
      'cancelled': 'Pagamento cancelado',
      'refunded': 'Pagamento estornado',
      'charged_back': 'Chargeback'
    }

    const currentStatus = currentPaymentData?.status || transaction.status
    const statusDescription = statusMap[currentStatus] || 'Status desconhecido'

    // Se o status mudou, atualizar no banco
    if (currentPaymentData && currentPaymentData.status !== transaction.status) {
      let newStatus = 'pending'
      
      switch (currentPaymentData.status) {
        case 'approved':
          newStatus = 'completed'
          break
        case 'rejected':
        case 'cancelled':
          newStatus = 'failed'
          break
        case 'refunded':
        case 'charged_back':
          newStatus = 'refunded'
          break
        default:
          newStatus = 'pending'
      }

      await supabase
        .from('transactions')
        .update({
          status: newStatus,
          gateway_response: currentPaymentData,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
    }

    // Verificar se o pagamento expirou
    const isExpired = transaction.expires_at && new Date() > new Date(transaction.expires_at)

    // Extrair dados do QR Code se disponível
    const gatewayResponse = currentPaymentData || transaction.gateway_response
    const qrCodeData = gatewayResponse?.point_of_interaction?.transaction_data

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        paymentId: transaction.gateway_transaction_id,
        status: currentStatus,
        statusDescription,
        amount: transaction.amount,
        currency: transaction.currency,
        createdAt: transaction.created_at,
        expiresAt: transaction.expires_at,
        isExpired,
        pix: qrCodeData ? {
          qrCode: qrCodeData.qr_code,
          qrCodeBase64: qrCodeData.qr_code_base64,
          copyPasteCode: qrCodeData.qr_code
        } : null,
        externalReference: transaction.external_reference,
        paymentMethod: transaction.payment_method,
        gateway: transaction.gateway
      }
    }

  } catch (error: any) {
    logger.error('Erro ao consultar status do pagamento:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})