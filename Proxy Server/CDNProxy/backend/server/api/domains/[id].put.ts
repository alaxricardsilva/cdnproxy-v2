import { logger } from '~/utils/logger'
import { z } from 'zod'
import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { validateDomainEdit } from '../../../utils/plan-validation'
import { requireUserAuth } from '../../../utils/hybrid-auth'
import { validateTargetUrl } from '../../../utils/url-validation'

const updateDomainSchema = z.object({
  domain: z.string().min(1, 'Domínio é obrigatório').optional(),
  target_url: z.string().min(1, 'URL de destino é obrigatória').refine((url) => {
    const validation = validateTargetUrl(url)
    return validation.valid
  }, {
    message: 'URL de destino inválida. Use formato: http://exemplo.com:8080 ou https://exemplo.com'
  }).optional(),
  cache_ttl: z.number().min(0).max(86400).optional(),
  enabled: z.boolean().optional(),
  redirect_301: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user and get Supabase client
    const { user, supabase } = await requireUserAuth(event)

    const domainId = getRouterParam(event, 'id')
    
    if (!domainId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID do domínio é obrigatório'
      })
    }

    // Parse and validate request body
    const body = await readBody(event)
    const updateData = updateDomainSchema.parse(body)

    // Normalize target URL if provided
    if (updateData.target_url) {
      const urlValidation = validateTargetUrl(updateData.target_url)
      updateData.target_url = urlValidation.url
    }

    // Validate domain edit permissions and plan
    const editValidation = await validateDomainEdit(supabase, user.id, domainId)
    
    if (!editValidation.canEdit) {
      throw createError({
        statusCode: 403,
        statusMessage: editValidation.reason || 'Não é possível editar este domínio'
      })
    }

    // If changing domain name, check if new domain already exists
    if (updateData.domain && updateData.domain !== editValidation.domain?.domain) {
      const { data: existingDomain } = await supabase
        .from('domains')
        .select('id')
        .eq('domain', updateData.domain)
        .single()

      if (existingDomain) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Domínio já existe'
        })
      }
    }

    // Update domain
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)
      .eq('user_id', user.id)
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

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao atualizar domínio'
      })
    }

    return {
      success: true,
      data: updatedDomain,
      message: 'Domínio atualizado com sucesso'
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