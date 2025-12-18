import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam, readBody, getHeader } from 'h3'
import { requireAdminAuth } from '../../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    const planId = getRouterParam(event, 'id')
    if (!planId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do plano é obrigatório'
      })
    }

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

    // Verificar se o plano existe
    const { data: existingPlan, error: checkError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (checkError || !existingPlan) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Plano não encontrado'
      })
    }

    // Verificar se já existe outro plano com o mesmo nome (exceto o atual)
    const { data: duplicatePlan, error: duplicateError } = await supabase
      .from('plans')
      .select('id')
      .eq('name', name)
      .neq('id', planId)
      .single()

    if (duplicatePlan && !duplicateError) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Já existe um plano com este nome'
      })
    }

    // Atualizar o plano
    const { data: updatedPlan, error: updateError } = await supabase
      .from('plans')
      .update({
        name,
        description,
        price: price.toString(),
        duration_value,
        duration_type,
        features: features || [],
        status: status || 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single()

    if (updateError) {
      logger.error('Erro ao atualizar plano:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao atualizar plano'
      })
    }

    // Registrar log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'PLAN_UPDATED',
        resource_type: 'plan',
        resource_id: planId,
        details: {
          plan_id: planId,
          changes: {
            name: { from: existingPlan.name, to: name },
            description: { from: existingPlan.description, to: description },
            price: { from: existingPlan.price, to: price.toString() },
            duration_value: { from: existingPlan.duration_value, to: duration_value },
            duration_type: { from: existingPlan.duration_type, to: duration_type },
            features: { from: existingPlan.features, to: features },
            status: { from: existingPlan.status, to: status }
          }
        },
        ip_address: getClientIP(event),
        user_agent: getHeader(event, 'user-agent')
      })

    const formattedPlan = {
      id: updatedPlan.id,
      name: updatedPlan.name,
      description: updatedPlan.description,
      // Preços - incluindo todos os campos para consistência
      price: parseFloat(updatedPlan.price) || 0,           // Preço base do banco
      monthly_price: parseFloat(updatedPlan.monthly_price) || 0,  // Preço mensal
      yearly_price: parseFloat(updatedPlan.yearly_price) || 0,    // Preço anual
      // Campos de ciclo de cobrança
      billing_cycle: updatedPlan.duration_type === 'month' ? 'mensal' : 
                    updatedPlan.duration_type === 'year' ? 'anual' : 
                    updatedPlan.duration_type,
      duration_value: updatedPlan.duration_value,
      duration_type: updatedPlan.duration_type,
      // Recursos e configurações
      features: updatedPlan.features || [],
      max_domains: updatedPlan.max_domains,
      max_bandwidth_gb: updatedPlan.max_bandwidth_gb,
      // Metadados
      status: updatedPlan.status,
      currency: updatedPlan.currency || 'BRL',
      is_active: updatedPlan.is_active,
      active: updatedPlan.active,
      company: updatedPlan.company,
      created_at: updatedPlan.created_at,
      updated_at: updatedPlan.updated_at
    }

    return {
      success: true,
      message: 'Plano atualizado com sucesso',
      data: formattedPlan
    }

  } catch (error) {
    logger.error('Erro ao atualizar plano:', error)
    
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