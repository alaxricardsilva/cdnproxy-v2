import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    const body = await readBody(event)
    const { name, description, price, duration_value, duration_type, features, status } = body

    // Validações básicas de presença
    if (!name || !description || !price || !duration_value || !duration_type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Campos obrigatórios: name, description, price, duration_value, duration_type'
      })
    }

    // Validações de tipo e formato
    if (typeof name !== 'string' || name.trim().length < 3) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Nome deve ser uma string com pelo menos 3 caracteres'
      })
    }

    if (typeof description !== 'string' || description.trim().length < 10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Descrição deve ser uma string com pelo menos 10 caracteres'
      })
    }

    if (typeof price !== 'number' || price <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Preço deve ser um número maior que zero'
      })
    }

    if (!['month', 'year', 'day'].includes(duration_type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tipo de duração deve ser: month, year ou day'
      })
    }

    if (typeof duration_value !== 'number' || duration_value <= 0 || !Number.isInteger(duration_value)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Valor da duração deve ser um número inteiro maior que zero'
      })
    }

    if (features && !Array.isArray(features)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Features deve ser um array'
      })
    }

    if (status && !['active', 'inactive'].includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Status deve ser: active ou inactive'
      })
    }

    // Verificar se já existe um plano com o mesmo nome
    const { data: existingPlan, error: checkError } = await supabase
      .from('plans')
      .select('id')
      .eq('name', name)
      .single()

    if (existingPlan && !checkError) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Já existe um plano com este nome'
      })
    }

    // Criar o novo plano
    const { data: newPlan, error: planError } = await supabase
      .from('plans')
      .insert({
        name,
        description,
        price: price.toString(),
        duration_value,
        duration_type,
        features: features || [],
        status: status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (planError) {
      logger.error('Erro ao criar plano:', planError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao criar plano'
      })
    }

    // Registrar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'PLAN_CREATED',
        resource_type: 'plan',
        resource_id: newPlan.id,
        details: {
          plan_id: newPlan.id,
          plan_name: name,
          plan_price: price.toString(),
          plan_duration: `${duration_value} ${duration_type}`,
          features: features || []
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      })

    const formattedPlan = {
      id: newPlan.id,
      name: newPlan.name,
      description: newPlan.description,
      price: parseFloat(newPlan.price),
      billing_cycle: newPlan.duration_type === 'month' ? 'mensal' : 
                    newPlan.duration_type === 'year' ? 'anual' : 
                    newPlan.duration_type,
      duration_value: newPlan.duration_value,
      duration_type: newPlan.duration_type,
      features: newPlan.features || [],
      status: newPlan.status,
      created_at: newPlan.created_at,
      updated_at: newPlan.updated_at
    }

    return {
      success: true,
      message: 'Plano criado com sucesso',
      data: formattedPlan
    }

  } catch (error) {
    logger.error('Erro ao criar plano:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})

// Função auxiliar para obter IP do cliente
function getClientIP(event: any): string {
  return getHeader(event, 'x-forwarded-for') || 
         getHeader(event, 'x-real-ip') || 
         getHeader(event, 'cf-connecting-ip') || 
         'unknown'
}