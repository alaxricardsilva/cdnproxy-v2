import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { logger, createRequestLogger, logRequestEnd } from '~/utils/logger'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha é obrigatória e deve ter pelo menos 6 caracteres')
})

export default defineEventHandler(async (event) => {
  const requestId = createRequestLogger()(event)
  const startTime = Date.now()
  
  try {
    // Parse and validate request body
    const body = await readBody(event)
    
    // Log da requisição para debug
    logger.debug('Login request received', { 
      body: { email: body?.email, passwordLength: body?.password?.length },
      requestId 
    })
    
    const validationResult = loginSchema.safeParse(body)
    
    if (!validationResult.success) {
      logger.debug('Validation failed', { 
        errors: validationResult.error.errors,
        requestId 
      })
      
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados de login inválidos',
        data: validationResult.error.errors
      })
    }
    
    const { email, password } = validationResult.data

    logger.debug('Login attempt started', { email, requestId })

    // Get Supabase config
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey
    )

    // Authenticate user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      logger.auth('login', false, undefined, email, { 
        error: error.message,
        requestId 
      })
      
      logRequestEnd(event, 401, undefined, error)
      
      throw createError({
        statusCode: 401,
        statusMessage: 'Credenciais inválidas'
      })
    }

    logger.auth('login', true, data.user?.id, email, { 
      requestId,
      sessionId: data.session?.access_token?.substring(0, 10) + '...'
    })

    logRequestEnd(event, 200, data.user?.id)

    // Return user data and session
    return {
      success: true,
      user: data.user,
      session: data.session
    }

  } catch (error: any) {
    const statusCode = error.statusCode || 400
    
    logger.error('Login failed', error instanceof Error ? error : new Error(String(error)), { requestId }, {
      requestId,
      endpoint: '/api/auth/login',
      method: 'POST',
      statusCode
    })
    
    logRequestEnd(event, statusCode, undefined, error instanceof Error ? error : new Error(String(error)))
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Dados inválidos'
    })
  }
})