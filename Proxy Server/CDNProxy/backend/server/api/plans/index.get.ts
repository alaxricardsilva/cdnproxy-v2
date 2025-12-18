import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // API pública - sem autenticação necessária
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true })

    if (error) {
      return {
        success: false,
        error: 'Erro ao buscar planos',
        details: error.message
      }
    }

    const mappedPlans = plans?.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: parseFloat(plan.monthly_price) || 0,
      monthly_price: parseFloat(plan.monthly_price) || 0,
      yearly_price: parseFloat(plan.yearly_price) || 0,
      max_domains: plan.max_domains,
      max_bandwidth_gb: plan.max_bandwidth_gb,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
      is_active: plan.is_active,
      status: plan.status,
      currency: plan.currency || 'BRL',
      billing_cycle: plan.billing_cycle || 'monthly',
      duration_type: plan.duration_type,
      duration_value: plan.duration_value
    })) || []

    return {
      success: true,
      data: mappedPlans,
      message: 'Planos recuperados com sucesso'
    }

  } catch (error: any) {
    return {
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }
  }
})