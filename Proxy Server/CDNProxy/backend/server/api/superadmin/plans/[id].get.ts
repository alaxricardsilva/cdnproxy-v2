import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getRouterParam } from 'h3'
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

    // Buscar o plano específico
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      logger.error('Plano não encontrado:', { planId, error: planError })
      throw createError({
        statusCode: 404,
        statusMessage: `Plano com ID '${planId}' não foi encontrado no sistema`
      })
    }

    // Buscar estatísticas do plano
    const { data: subscriptions, error: subsError } = await supabase
      .from('transactions')
      .select(`
        id,
        status,
        amount,
        created_at,
        user_id,
        users(id, email, name)
      `)
      .eq('plan_id', planId)

    let totalSubscribers = 0
    let activeSubscribers = 0
    let totalRevenue = 0
    let recentSubscriptions: any[] = []

    if (subscriptions && !subsError) {
      totalSubscribers = subscriptions.length
      activeSubscribers = subscriptions.filter(s => s.status === 'COMPLETED').length
      totalRevenue = subscriptions
        .filter(s => s.status === 'COMPLETED')
        .reduce((sum, s) => sum + parseFloat(s.amount), 0)
      
      recentSubscriptions = subscriptions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(sub => {
          const user = Array.isArray(sub.users) ? sub.users[0] : sub.users
          return {
            id: sub.id,
            user: {
              id: user?.id || sub.user_id,
              email: user?.email || 'N/A',
              name: user?.name || 'N/A'
            },
            amount: parseFloat(sub.amount),
            status: sub.status,
            created_at: sub.created_at
          }
        })
    }

    // Buscar histórico de mudanças do plano (se houver tabela de auditoria)
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_type', 'plan')
      .eq('resource_id', planId)
      .order('created_at', { ascending: false })
      .limit(20)

    const formattedPlan = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      // Preços - usando os campos corretos do banco
      price: parseFloat(plan.monthly_price) || 0,        // Usar monthly_price como price principal
      monthly_price: parseFloat(plan.monthly_price) || 0, // Preço mensal do banco
      yearly_price: parseFloat(plan.yearly_price) || 0,   // Preço anual do banco
      // Campos de ciclo de cobrança
      billing_cycle: plan.billing_cycle || (plan.duration_type === 'months' ? 'monthly' : 'yearly'),
      duration_value: plan.duration_value,
      duration_type: plan.duration_type,
      // Recursos e configurações
      features: plan.features || [],
      max_domains: plan.max_domains,
      max_bandwidth_gb: plan.max_bandwidth_gb,
      // Metadados
      status: plan.status || 'active',
      currency: plan.currency || 'BRL',
      is_active: plan.is_active,
      active: plan.active,
      company: plan.company,
      created_at: plan.created_at,
      updated_at: plan.updated_at,
      // Estatísticas específicas do plano
      stats: {
        totalSubscribers,
        activeSubscribers,
        totalRevenue,
        conversionRate: totalSubscribers > 0 ? (activeSubscribers / totalSubscribers) * 100 : 0
      },
      recentSubscriptions,
      auditLogs: auditLogs || []
    }

    return {
      success: true,
      data: formattedPlan
    }

  } catch (error) {
    logger.error('Erro ao buscar plano:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})