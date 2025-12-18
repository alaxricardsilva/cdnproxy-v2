import { logger } from '~/utils/logger'
import { z } from 'zod'
import { requireUserAuth } from '../../../utils/hybrid-auth'

const upgradePlanSchema = z.object({
  planId: z.string().min(1, 'ID do plano é obrigatório')
})

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    // Parse and validate request body
    const body = await readBody(event)
    const { planId } = upgradePlanSchema.parse(body)

    // Verify plan exists and is active
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .eq('active', true)
      .single()

    if (planError || !plan) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Plano não encontrado'
      })
    }

    // Get current user plan
    const { data: currentUserPlan, error: userPlanError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (userPlanError && userPlanError.code !== 'PGRST116') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao verificar plano atual'
      })
    }

    // Calculate new expiration date (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Start transaction: deactivate current plan and create new one
    if (currentUserPlan) {
      // Deactivate current plan
      const { error: deactivateError } = await supabase
        .from('user_plans')
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUserPlan.id)

      if (deactivateError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Erro ao desativar plano atual'
        })
      }
    }

    // Create new user plan
    const { data: newUserPlan, error: insertError } = await supabase
      .from('user_plans')
      .insert({
        user_id: user.id,
        plan_id: planId,
        expires_at: expiresAt.toISOString(),
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        plans!inner(
          id,
          name,
          description,
          max_domains,
          max_bandwidth_gb,
          max_requests_per_month,
          price,
          duration_value,
          duration_type,
          features
        )
      `)
      .single()

    if (insertError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao criar novo plano'
      })
    }

    // Update all user domains to use the new plan
    const { error: updateDomainsError } = await supabase
      .from('domains')
      .update({
        plan_id: planId,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateDomainsError) {
      logger.error('Erro ao atualizar domínios:', updateDomainsError)
      // Don't throw error here as the plan upgrade was successful
    }

    return {
      success: true,
      data: newUserPlan,
      message: 'Plano atualizado com sucesso'
    }

  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    // Handle validation errors
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: error.errors[0]?.message || 'Dados inválidos'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})