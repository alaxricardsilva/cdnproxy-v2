import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  return {
    success: true,
    message: 'API de teste funcionando sem autenticação',
    timestamp: new Date().toISOString()
  }
})