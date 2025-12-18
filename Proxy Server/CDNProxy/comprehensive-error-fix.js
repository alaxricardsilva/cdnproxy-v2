const fs = require('fs');
const path = require('path');

console.log('🔧 INICIANDO CORREÇÃO ABRANGENTE DE ERROS');
console.log('==========================================');

// Configurações
const config = {
  removeConsoleLog: true,
  improveErrorHandling: true,
  fixUndefinedVariables: true,
  addProperLogging: true,
  fixHardcodedUrls: true
};

// Função para substituir console.log por logger adequado
function replaceConsoleLog(content, filePath) {
  if (!config.removeConsoleLog) return content;
  
  // Adicionar import do logger se não existir
  if (!content.includes('import { logger }') && !content.includes('const { logger }')) {
    if (filePath.includes('backend/')) {
      content = `import { logger } from '~/utils/logger'\n${content}`;
    }
  }
  
  // Substituir console.log por logger.info
  content = content.replace(/console\.log\(/g, 'logger.info(');
  
  return content;
}

// Função para melhorar tratamento de erros
function improveErrorHandling(content) {
  if (!config.improveErrorHandling) return content;
  
  // Substituir console.error por logger.error
  content = content.replace(/console\.error\(/g, 'logger.error(');
  
  // Melhorar blocos try-catch
  content = content.replace(
    /} catch \(error\) {\s*console\.error\([^)]+\)/g,
    '} catch (error) {\n    logger.error(\'Erro inesperado:\', error)\n    throw error'
  );
  
  return content;
}

// Função para corrigir variáveis undefined
function fixUndefinedVariables(content) {
  if (!config.fixUndefinedVariables) return content;
  
  // Corrigir comparações com undefined
  content = content.replace(
    /if \(([^)]+) === undefined\)/g,
    'if (typeof $1 === \'undefined\' || $1 === null)'
  );
  
  content = content.replace(
    /if \(([^)]+) !== undefined\)/g,
    'if (typeof $1 !== \'undefined\' && $1 !== null)'
  );
  
  return content;
}

// Função para corrigir URLs hardcoded
function fixHardcodedUrls(content) {
  if (!config.fixHardcodedUrls) return content;
  
  // Substituir URLs hardcoded por variáveis de ambiente
  content = content.replace(
    /https:\/\/api\.cdnproxy\.top/g,
    'process.env.BACKEND_URL || \'https://api.cdnproxy.top\''
  );
  
  content = content.replace(
    /https:\/\/app\.cdnproxy\.top/g,
    'process.env.FRONTEND_URL || \'https://app.cdnproxy.top\''
  );
  
  return content;
}

// Função para processar arquivo
function processFile(filePath) {
  try {
    console.log(`🔧 Processando: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Aplicar correções
    content = replaceConsoleLog(content, filePath);
    content = improveErrorHandling(content);
    content = fixUndefinedVariables(content);
    content = fixHardcodedUrls(content);
    
    // Salvar apenas se houve mudanças
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ Arquivo corrigido`);
      return true;
    } else {
      console.log(`   ⏭️  Nenhuma correção necessária`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Função para escanear diretório
function scanAndFix(directory) {
  const stats = { processed: 0, fixed: 0, errors: 0 };
  
  function scan(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Pular diretórios desnecessários
          if (!item.startsWith('.') && 
              item !== 'node_modules' && 
              item !== '.nuxt' && 
              item !== '.output' &&
              item !== 'dist') {
            scan(fullPath);
          }
        } else if (stat.isFile()) {
          // Processar apenas arquivos relevantes
          if (item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.vue')) {
            stats.processed++;
            if (processFile(fullPath)) {
              stats.fixed++;
            }
          }
        }
      });
    } catch (error) {
      console.error(`Erro ao escanear ${dir}:`, error.message);
      stats.errors++;
    }
  }
  
  scan(directory);
  return stats;
}

// Criar arquivo de logger se não existir
function createLoggerFile() {
  const loggerPath = './backend/utils/logger.ts';
  
  if (!fs.existsSync(loggerPath)) {
    console.log('📝 Criando arquivo de logger...');
    
    const loggerContent = `// Logger utilitário para substituir console.log/error
export const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },
  
  warn: (...args: any[]) => {
    console.warn('[WARN]', new Date().toISOString(), ...args);
  },
  
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', new Date().toISOString(), ...args);
    }
  }
};`;
    
    fs.writeFileSync(loggerPath, loggerContent, 'utf8');
    console.log('   ✅ Logger criado');
  }
}

// Executar correções
async function main() {
  console.log('🚀 Iniciando processo de correção...\n');
  
  // Criar logger
  createLoggerFile();
  
  // Processar backend
  console.log('📁 PROCESSANDO BACKEND:');
  console.log('=======================');
  const backendStats = scanAndFix('./backend');
  
  console.log('\n📁 PROCESSANDO FRONTEND:');
  console.log('========================');
  const frontendStats = scanAndFix('./frontend');
  
  // Relatório final
  console.log('\n📊 RELATÓRIO FINAL:');
  console.log('==================');
  console.log(`Backend: ${backendStats.processed} arquivos processados, ${backendStats.fixed} corrigidos, ${backendStats.errors} erros`);
  console.log(`Frontend: ${frontendStats.processed} arquivos processados, ${frontendStats.fixed} corrigidos, ${frontendStats.errors} erros`);
  console.log(`Total: ${backendStats.processed + frontendStats.processed} arquivos processados`);
  console.log(`Total corrigido: ${backendStats.fixed + frontendStats.fixed} arquivos`);
  
  if (backendStats.errors + frontendStats.errors > 0) {
    console.log(`⚠️  ${backendStats.errors + frontendStats.errors} erros encontrados durante o processo`);
  }
  
  console.log('\n✅ Processo de correção concluído!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('- Executar testes para validar as correções');
  console.log('- Verificar se todas as funcionalidades ainda funcionam');
  console.log('- Fazer commit das alterações');
}

// Executar
main().catch(console.error);