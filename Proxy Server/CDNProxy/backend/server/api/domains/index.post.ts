import { logger } from '~/utils/logger'
import { defineEventHandler, createError, readBody } from 'h3'
import { z } from 'zod'
import { validateDomainCreation } from '../../../utils/plan-validation'
import { requireUserAuth } from '../../../utils/hybrid-auth'
import { validateTargetUrl } from '../../../utils/url-validation'

const createDomainSchema = z.object({
  domain: z.string().min(1, 'Domínio é obrigatório'),
  target_url: z.string().min(1, 'URL de destino é obrigatória').refine((url) => {
    const validation = validateTargetUrl(url)
    return validation.valid
  }, {
    message: 'URL de destino inválida. Use formato: http://exemplo.com:8080 ou https://exemplo.com'
  }),
  cache_ttl: z.number().min(0).max(86400).optional().default(3600),
  enabled: z.boolean().optional().default(true),
  plan_id: z.string().min(1, 'Plano é obrigatório'),
  expires_at: z.string().optional(),
  redirect_301: z.boolean().optional().default(false),
  analytics_enabled: z.boolean().optional().default(true)
})

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    // Parse and validate request body
    const body = await readBody(event)
    const { domain, target_url, cache_ttl, enabled, plan_id, expires_at, redirect_301, analytics_enabled } = createDomainSchema.parse(body)

    // Normalize target URL
    const urlValidation = validateTargetUrl(target_url)
    const normalizedTargetUrl = urlValidation.url

    // Validate plan limits before creating domain
    const planValidation = await validateDomainCreation(supabase, user.id, plan_id)
    
    if (!planValidation.canCreate) {
      throw createError({
        statusCode: 403,
        statusMessage: planValidation.reason || 'Não é possível criar domínio'
      })
    }

    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from('domains')
      .select('id')
      .eq('domain', domain)
      .single()

    if (existingDomain) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Domínio já existe'
      })
    }

    // Create domain
    const { data: newDomain, error: insertError } = await supabase
      .from('domains')
      .insert({
        domain,
        target_url: normalizedTargetUrl,
        cache_ttl,
        enabled,
        user_id: user.id,
        plan_id,
        expires_at: expires_at || null,
        redirect_301,
        analytics_enabled,
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
        statusMessage: 'Erro ao criar domínio'
      })
    }

    return {
      success: true,
      data: newDomain,
      planInfo: planValidation.planInfo,
      message: 'Domínio criado com sucesso'
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