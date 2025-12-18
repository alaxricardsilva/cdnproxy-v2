// Utilitários de timezone para CommonJS
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

/**
 * Obtém a data/hora atual no fuso horário de São Paulo
 * @returns {Date} Data atual no fuso horário de São Paulo
 */
function getNowInSaoPaulo() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: SAO_PAULO_TIMEZONE }));
}

/**
 * Converte uma data para o fuso horário de São Paulo
 * @param {Date} date - Data a ser convertida
 * @returns {Date} Data no fuso horário de São Paulo
 */
function toSaoPauloTime(date) {
  return new Date(date.toLocaleString("en-US", { timeZone: SAO_PAULO_TIMEZONE }));
}

/**
 * Converte uma data para string ISO no fuso horário de São Paulo
 * @param {Date} date - Data a ser convertida (opcional, usa data atual se não fornecida)
 * @returns {string} String ISO no fuso horário de São Paulo
 */
function toSaoPauloISOString(date = new Date()) {
  const saoPauloDate = new Date(date.toLocaleString("en-US", { timeZone: SAO_PAULO_TIMEZONE }));
  return saoPauloDate.toISOString();
}

/**
 * Cria uma nova data no fuso horário de São Paulo
 * @param {string|number|Date} input - Input para criar a data
 * @returns {Date} Nova data no fuso horário de São Paulo
 */
function createSaoPauloDate(input) {
  const date = input ? new Date(input) : new Date();
  return new Date(date.toLocaleString("en-US", { timeZone: SAO_PAULO_TIMEZONE }));
}

/**
 * Formata uma data para exibição no fuso horário de São Paulo
 * @param {Date} date - Data a ser formatada
 * @param {string} locale - Locale para formatação (padrão: 'pt-BR')
 * @returns {string} Data formatada
 */
function formatSaoPauloDate(date, locale = 'pt-BR') {
  return date.toLocaleString(locale, { 
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

module.exports = {
  SAO_PAULO_TIMEZONE,
  getNowInSaoPaulo,
  toSaoPauloTime,
  toSaoPauloISOString,
  createSaoPauloDate,
  formatSaoPauloDate
};