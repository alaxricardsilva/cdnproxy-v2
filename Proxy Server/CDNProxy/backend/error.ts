import { logger } from '~/utils/logger'
import type { NitroErrorHandler } from 'nitropack'

export default <NitroErrorHandler>function (error, event) {
  // Para rotas de API, sempre retornar JSON
  if (event.node.req.url?.startsWith('/api/')) {
    event.node.res.statusCode = error.statusCode || 500
    event.node.res.setHeader('Content-Type', 'application/json')
    
    const response = JSON.stringify({
      error: true,
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error',
      message: error.message || 'An error occurred'
    })
    
    event.node.res.end(response)
    return
  }

  // Para outras rotas, retornar erro 404 simples
  event.node.res.statusCode = 404
  event.node.res.setHeader('Content-Type', 'application/json')
  
  const response = JSON.stringify({
    error: true,
    statusCode: 404,
    statusMessage: 'Not Found',
    message: 'API endpoint not found'
  })
  
  event.node.res.end(response)
}