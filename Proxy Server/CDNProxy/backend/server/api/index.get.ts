import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  return {
    success: true,
    message: 'CDNProxy API is running',
    version: '1.2.4',
    timestamp: new Date().toISOString(),
    documentation: 'https://api.cdnproxy.top/api/docs' // Se houver documentação da API
  }
})