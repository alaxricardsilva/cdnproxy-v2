import { logger } from '~/utils/logger'
/**
 * Utilitário para gerenciar fuso horário de São Paulo
 */

// Configurar fuso horário padrão para America/Sao_Paulo
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo'

/**
 * Retorna a data atual no fuso horário de São Paulo
 */
export function getNowInSaoPaulo(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: SAO_PAULO_TIMEZONE }))
}

/**
 * Converte uma data para o fuso horário de São Paulo
 */
export function toSaoPauloTime(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: SAO_PAULO_TIMEZONE }))
}

/**
 * Retorna uma data no formato ISO string ajustada para São Paulo
 */
export function toSaoPauloISOString(date?: Date): string {
  const targetDate = date || new Date()
  
  // Obter a data no fuso horário de São Paulo
  const saoPauloDate = new Date(targetDate.toLocaleString("en-US", { timeZone: SAO_PAULO_TIMEZONE }))
  
  // Calcular o offset de São Paulo em relação ao UTC
  const utcTime = targetDate.getTime() + (targetDate.getTimezoneOffset() * 60000)
  const saoPauloTime = new Date(utcTime + (-3 * 3600000)) // São Paulo é UTC-3
  
  // Retornar no formato ISO com o offset correto
  const year = saoPauloTime.getFullYear()
  const month = String(saoPauloTime.getMonth() + 1).padStart(2, '0')
  const day = String(saoPauloTime.getDate()).padStart(2, '0')
  const hours = String(saoPauloTime.getHours()).padStart(2, '0')
  const minutes = String(saoPauloTime.getMinutes()).padStart(2, '0')
  const seconds = String(saoPauloTime.getSeconds()).padStart(2, '0')
  const milliseconds = String(saoPauloTime.getMilliseconds()).padStart(3, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}-03:00`
}

/**
 * Cria uma nova data no fuso horário de São Paulo
 */
export function createSaoPauloDate(year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number): Date {
  const now = getNowInSaoPaulo()
  
  return new Date(
    year ?? now.getFullYear(),
    month ?? now.getMonth(),
    day ?? now.getDate(),
    hour ?? now.getHours(),
    minute ?? now.getMinutes(),
    second ?? now.getSeconds()
  )
}

/**
 * Calcula período de tempo baseado no fuso horário de São Paulo
 */
export function calculatePeriodInSaoPaulo(period: string): { startDate: Date, endDate: Date } {
  const endDate = getNowInSaoPaulo()
  const startDate = new Date(endDate)
  
  switch (period) {
    case '24h':
      startDate.setHours(endDate.getHours() - 24)
      break
    case '7d':
      startDate.setDate(endDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(endDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(endDate.getDate() - 90)
      break
    default:
      startDate.setDate(endDate.getDate() - 7)
  }
  
  return { startDate, endDate }
}

/**
 * Formatar data para exibição no fuso horário de São Paulo
 */
export function formatSaoPauloDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }
  
  return date.toLocaleString('pt-BR', { ...defaultOptions, ...options })
}