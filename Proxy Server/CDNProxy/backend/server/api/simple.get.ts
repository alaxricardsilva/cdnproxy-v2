import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  return {
    success: true,
    message: 'API simples funcionando',
    timestamp: new Date().toISOString()
  }
})