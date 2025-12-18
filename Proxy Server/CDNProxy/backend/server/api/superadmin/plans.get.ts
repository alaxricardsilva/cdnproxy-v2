import { logger } from '~/utils/logger'
import { defineEventHandler, createError, getQuery } from 'h3'
import { requireAdminAuth } from '../../../utils/hybrid-auth'

export default defineEventHandler(async (event) => {
  try {
    // Verificar autenticação SUPERADMIN
    const { user, userProfile, supabase } = await requireAdminAuth(event, 'SUPERADMIN')

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const search = query.search as string || ''
    const status = query.status as string || ''
    const offset = (page - 1) * limit

    // Construir query base para buscar todos os planos
    let queryBuilder = supabase
      .from('plans')
      .select('*')

    // Aplicar filtros
    if (search) {
      queryBuilder = queryBuilder.or(`
        name.ilike.%${search}%,
        description.ilike.%${search}%
      `)
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status)
    }

    // Buscar planos com paginação
    const { data: plans, error: plansError } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (plansError) {
      logger.error('Erro ao buscar planos:', plansError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro interno do servidor'
      })
    }

    // Buscar total de registros para paginação
    const { count, error: countError } = await supabase
      .from('plans')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      logger.error('Erro ao contar planos:', countError)
    }

    // Buscar estatísticas de assinantes para cada plano
    const planIds = plans?.map(plan => plan.id) || []
    const { data: subscriptions, error: subsError } = await supabase
      .from('transactions')
      .select('plan_id, status')
      .in('plan_id', planIds)
      .eq('status', 'COMPLETED')

    // Calcular estatísticas
    const subscribersByPlan = subscriptions?.reduce((acc, sub) => {
      acc[sub.plan_id] = (acc[sub.plan_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Buscar estatísticas gerais
    const { data: allPlans, error: allPlansError } = await supabase
      .from('plans')
      .select('status')

    let totalPlans = 0
    let activePlans = 0
    let totalSubscribers = 0
    let monthlyRevenue = 0

    if (allPlans && !allPlansError) {
      totalPlans = allPlans.length
      activePlans = allPlans.filter(p => p.status === 'active').length
    }

    if (subscriptions && !subsError) {
      totalSubscribers = subscriptions.length
      
      // Calcular receita mensal baseada nos planos ativos
      const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select(`
          amount,
          plans!inner(price)
        `)
        .eq('status', 'COMPLETED')

      if (revenueData && !revenueError) {
        monthlyRevenue = revenueData.reduce((sum, t) => sum + parseFloat(t.amount), 0)
      }
    }

    // Formatar dados dos planos
    const formattedPlans = plans?.map(plan => ({
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
      // Estatísticas e metadados
      subscribers: subscribersByPlan[plan.id] || 0,
      status: plan.status || 'active',
      currency: plan.currency || 'BRL',
      is_active: plan.is_active,
      active: plan.active,
      company: plan.company,
      created_at: plan.created_at,
      updated_at: plan.updated_at
    })) || []

    return {
      success: true,
      data: {
        plans: formattedPlans,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        stats: {
          totalPlans,
          activePlans,
          subscribers: totalSubscribers,
          monthlyRevenue
        }
      }
    }

  } catch (error: any) {
    logger.error('Erro na API de planos do superadmin:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})