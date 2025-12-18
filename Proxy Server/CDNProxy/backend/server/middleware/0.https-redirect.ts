import { defineEventHandler, getRequestURL, getHeader, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  // Pular redirecionamento para rotas de API em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    return
  }

  // Pular redirecionamento para todas as rotas de API
  const url = getRequestURL(event)
  if (url.pathname.startsWith('/api/')) {
    return
  }
  
  // Pular redirecionamento para a rota raiz
  if (url.pathname === '/') {
    return
  }
  
  // Redirecionar HTTP para HTTPS somente em produção
  if (url.protocol === 'http:') {
    const host = getHeader(event, 'host')
    
    if (host) {
      console.log(`HTTPS Redirect: ${url.href} -> https://${host}${url.pathname}${url.search}`)
      
      await sendRedirect(event, `https://${host}${url.pathname}${url.search}`, 301)
    }
  }
})