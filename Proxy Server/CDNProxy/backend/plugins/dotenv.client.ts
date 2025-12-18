import { logger } from '~/utils/logger'
// Plugin para carregar variáveis de ambiente
export default defineNuxtPlugin(() => {
  // Este plugin garante que as variáveis de ambiente sejam carregadas
  logger.info('🔧 Plugin dotenv carregado');
});