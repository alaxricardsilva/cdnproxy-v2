import { logger } from '~/utils/logger'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default defineEventHandler(async (event) => {
  try {
    // Verificar método HTTP
    if (event.node.req.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
      })
    }

    // Verificar autenticação
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token de acesso requerido'
      })
    }

    const token = authHeader.substring(7)
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token inválido'
      })
    }

    // Verificar se é admin
    if (decoded.role !== 'ADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      })
    }

    // Obter dados do corpo da requisição
    const body = await readBody(event)
    const { transaction_id } = body

    if (!transaction_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID da transação é obrigatório'
      })
    }

    // Buscar a transação com dados do usuário
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        user:users(*)
      `)
      .eq('id', transaction_id)
      .eq('user_id', decoded.userId)
      .single()

    if (transactionError || !transaction) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Transação não encontrada'
      })
    }

    // Verificar se a transação é PIX e está pendente
    if (transaction.payment_method !== 'pix' || transaction.status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Transação não é elegível para confirmação manual'
      })
    }

    // Atualizar status da transação para "awaiting_confirmation"
    const updatedMetadata = {
      ...transaction.metadata,
      user_confirmed_at: new Date().toISOString(),
      awaiting_admin_approval: true
    }

    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'awaiting_confirmation',
        metadata: updatedMetadata
      })
      .eq('id', transaction_id)
      .select()
      .single()

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao atualizar transação'
      })
    }

    // Criar notificação para o SUPERADMIN
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: '1', // SUPERADMIN ID
        type: 'pix_payment_confirmation',
        title: 'Confirmação de Pagamento PIX',
        message: `O usuário ${transaction.user.name} (${transaction.user.email}) confirmou o pagamento PIX de R$ ${transaction.amount.toFixed(2)} para renovação de domínios. Transação ID: ${transaction_id}`,
        metadata: {
          transaction_id: transaction_id,
          user_id: decoded.userId,
          user_name: transaction.user.name,
          user_email: transaction.user.email,
          amount: transaction.amount,
          payment_method: 'pix'
        }
      })

    if (notificationError) {
      logger.error('Erro ao criar notificação:', notificationError)
      // Não falhar a operação por causa da notificação
    }

    return {
      success: true,
      message: 'Pagamento PIX confirmado com sucesso. Aguardando aprovação do administrador.',
      data: {
        transaction_id: transaction_id,
        status: 'awaiting_confirmation',
        confirmed_at: new Date().toISOString()
      }
    }

  } catch (error: any) {
    logger.error('Erro ao confirmar pagamento PIX:', error)

    // Se for um erro conhecido, retornar como está
    if (error.statusCode) {
      throw error
    }

    // Erro genérico
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})