import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { getPagBankClient } from '../../../../../utils/pagbank-client'

export default defineEventHandler(async (event: any) => {
  try {
    // Verificar autenticação
    const token = getCookie(event, 'auth-token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
    
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de autenticação necessário'
      })
    }

    // Obter ID da transação da URL
    const transactionId = getRouterParam(event, 'id')
    
    if (!transactionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da transação é obrigatório'
      })
    }

    // Conectar ao Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verificar se o usuário está autenticado
    const { data: user, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Buscar transação no banco de dados
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.user.id) // Garantir que o usuário só veja suas próprias transações
      .single()

    if (transactionError || !transaction) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Transação não encontrada'
      })
    }

    // Obter cliente PagBank
    const pagBankClient = await getPagBankClient()
    
    if (!pagBankClient) {
      throw createError({
        statusCode: 503,
        statusMessage: 'PagBank não configurado'
      })
    }

    // Consultar status atual no PagBank
    let currentPaymentData: any = null
    try {
      currentPaymentData = await pagBankClient.getPaymentStatus(transaction.gateway_transaction_id)
    } catch (error) {
      logger.error('Erro ao consultar status no PagBank:', error)
      // Se não conseguir consultar, usar dados do banco
    }

    // Mapear status para formato amigável
    const statusMap: Record<string, string> = {
      'PAID': 'Pagamento aprovado',
      'WAITING': 'Aguardando pagamento',
      'DECLINED': 'Pagamento rejeitado',
      'CANCELED': 'Pagamento cancelado'
    }

    const currentStatus = currentPaymentData?.status || transaction.status
    const statusDescription = statusMap[currentStatus] || 'Status desconhecido'

    // Se o status mudou, atualizar no banco
    if (currentPaymentData && currentPaymentData.status !== transaction.gateway_response?.status) {
      let newStatus = 'pending'
      
      switch (currentPaymentData.status) {
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

      await supabase
        .from('transactions')
        .update({
          status: newStatus,
          gateway_response: currentPaymentData,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
    }

    // Verificar se o pagamento expirou (30 minutos)
    const createdAt = new Date(transaction.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
    const isExpired = diffMinutes > 30 && transaction.status === 'pending'

    // Extrair dados do PIX se disponível
    const qrCode = transaction.gateway_response?.qr_codes?.[0]
    const pixData = qrCode ? {
      qr_code: qrCode.text || '',
      qr_code_image: qrCode.links?.find((link: any) => link.media === 'image/png')?.href || ''
    } : null

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        payment_id: transaction.gateway_transaction_id,
        status: currentStatus,
        status_description: statusDescription,
        amount: transaction.amount,
        currency: transaction.currency,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        is_expired: isExpired,
        pix_data: pixData
      }
    }

  } catch (error: any) {
    logger.error('Erro ao consultar status PagBank:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Erro interno do servidor'
    })
  }
})