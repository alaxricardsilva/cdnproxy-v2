import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

// Interfaces para validação de planos
export interface PlanLimits {
  max_domains: number
  max_bandwidth_gb: number
  features: string[]
}

export interface UserPlanInfo {
  plan_id: string
  plan_name: string
  plan_expires_at: string
  plan_started_at: string
  limits: PlanLimits
  current_usage: {
    domains_count: number
    bandwidth_used_gb: number
    requests_this_month: number
  }
}

/**
 * Valida se o usuário pode criar um novo domínio baseado no plano especificado
 */
export async function validateDomainCreation(supabase: any, userId: string, planId?: string): Promise<{
  canCreate: boolean
  reason?: string
  planInfo?: UserPlanInfo
}> {
  try {
    let planData;
    
    if (planId) {
      // Se um plano específico foi fornecido, buscar informações desse plano
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id, name, max_domains, max_bandwidth_gb, features')
        .eq('id', planId)
        .single()

      if (planError || !plan) {
        return {
          canCreate: false,
          reason: 'Plano não encontrado'
        }
      }

      planData = {
        plan_id: plan.id,
        plan_name: plan.name,
        plan_expires_at: null, // Will be set when domain is created
        plan_started_at: new Date().toISOString(),
        plans: plan
      }
    } else {
      // Buscar informações do plano atual do usuário
      const { data: userPlan, error: planError } = await supabase
        .from('users')
        .select(`
          plan_id,
          plan_expires_at,
          plan_started_at,
          plans!inner(
            id,
            name,
            max_domains,
            max_bandwidth_gb,
            features
          )
        `)
        .eq('id', userId)
        .single()

      if (planError || !userPlan) {
        return {
          canCreate: false,
          reason: 'Plano do usuário não encontrado'
        }
      }

      planData = userPlan
    }
    // Verificar se o plano está ativo (apenas se não for um novo plano)
    if (!planId && planData.plan_expires_at) {
      const now = new Date()
      const expiresAt = new Date(planData.plan_expires_at)
      
      if (expiresAt < now) {
        return {
          canCreate: false,
          reason: 'Plano expirado'
        }
      }
    }

    // Contar domínios atuais do usuário
    const { count: domainsCount, error: countError } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      return {
        canCreate: false,
        reason: 'Erro ao verificar domínios existentes'
      }
    }

    const currentDomainsCount = domainsCount || 0
    const maxDomains = planData.plans.max_domains

    // Verificar limite de domínios
    if (currentDomainsCount >= maxDomains) {
      return {
        canCreate: false,
        reason: `Limite de domínios atingido (${currentDomainsCount}/${maxDomains})`
      }
    }

    // Retornar informações do plano
    const planInfo: UserPlanInfo = {
      plan_id: planData.plan_id,
      plan_name: planData.plans.name,
      plan_expires_at: planData.plan_expires_at || '',
      plan_started_at: planData.plan_started_at || new Date().toISOString(),
      limits: {
        max_domains: planData.plans.max_domains,
        max_bandwidth_gb: planData.plans.max_bandwidth_gb,
        features: planData.plans.features || []
      },
      current_usage: {
        domains_count: currentDomainsCount,
        bandwidth_used_gb: 0, // TODO: Implementar cálculo de bandwidth
        requests_this_month: 0 // TODO: Implementar cálculo de requests
      }
    }

    return {
      canCreate: true,
      planInfo
    }

  } catch (error) {
    logger.error('Erro na validação do plano:', error)
    return {
      canCreate: false,
      reason: 'Erro interno na validação do plano'
    }
  }
}

/**
 * Valida se o usuário pode editar um domínio específico
 */
export async function validateDomainEdit(
  supabase: any,
  userId: string,
  domainId: string
): Promise<{ canEdit: boolean; reason?: string; domain?: any }> {
  // Get domain with plan info
  const { data: domain, error } = await supabase
    .from('domains')
    .select(`
      *,
      plans!inner(
        id,
        name,
        max_domains,
        max_bandwidth_gb,
        max_requests_per_month
      )
    `)
    .eq('id', domainId)
    .eq('user_id', userId)
    .single()

  if (error || !domain) {
    return { canEdit: false, reason: 'Domínio não encontrado ou não pertence ao usuário' }
  }

  // Check if domain is expired
  if (domain.expires_at && new Date(domain.expires_at) < new Date()) {
    return { canEdit: false, reason: 'Domínio expirado' }
  }

  return { canEdit: true, domain }
}

/**
 * Obtém informações detalhadas do plano do usuário
 */
export async function getUserPlanInfo(supabase: any, userId: string): Promise<UserPlanInfo | null> {
  try {
    const validation = await validateDomainCreation(supabase, userId)
    return validation.planInfo || null
  } catch (error) {
    logger.error('Erro ao obter informações do plano:', error)
    return null
  }
}