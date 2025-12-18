import { defineEventHandler, setHeaders, getHeader, getMethod, setResponseStatus, getRequestURL } from 'h3'

export default defineEventHandler(async (event) => {
  // Configurar headers CORS para todas as requisições
  const origin = getHeader(event, 'origin')
  const url = getRequestURL(event)
  
  console.log('CORS Middleware - URL:', url.pathname)
  console.log('CORS Middleware - Method:', getMethod(event))
  
  // Domínios permitidos
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://app.cdnproxy.top',
    'https://app.cdnproxy.top',
    'https://api.cdnproxy.top',
    'https://cdnproxy.top',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5001',
    'http://127.0.0.1:5001'
  ]
  
  // Verificar se a origem está na lista de permitidas
  const isAllowedOrigin = allowedOrigins.includes(origin || '') || 
                         (origin && origin.startsWith('http://localhost:')) ||
                         (origin && origin.startsWith('http://127.0.0.1:')) ||
                         !origin // Permitir requisições sem origin (Postman, curl, etc.)
  
  // Definir headers CORS e de segurança
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, x-supabase-token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 horas
    'Vary': 'Origin',
    // Headers de segurança
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'self';"
  }
  
  // Aplicar headers CORS
  setHeaders(event, corsHeaders)
  
  // Log para debug
  console.log('CORS Middleware - Origin:', origin, 'Allowed:', isAllowedOrigin)
  
  // Responder a requisições OPTIONS (preflight)
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
  
  // Continuar com o processamento normal
})