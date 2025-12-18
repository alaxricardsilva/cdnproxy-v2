const fs = require('fs');
const path = require('path');

// Função para buscar arquivos recursivamente
function findFiles(dir, extensions, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findFiles(fullPath, extensions, files);
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Função para analisar erros comuns em arquivos JavaScript/TypeScript
function analyzeFile(filePath) {
  const errors = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Verificar console.error
      if (line.includes('console.error')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'console.error',
          content: line.trim()
        });
      }
      
      // Verificar throw new Error
      if (line.includes('throw new Error') || line.includes('throw Error')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'throw error',
          content: line.trim()
        });
      }
      
      // Verificar try/catch sem tratamento
      if (line.includes('catch') && line.includes('{}')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'empty catch',
          content: line.trim()
        });
      }
      
      // Verificar imports/requires quebrados
      if ((line.includes('import') || line.includes('require')) && line.includes('undefined')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'broken import',
          content: line.trim()
        });
      }
      
      // Verificar variáveis não definidas
      if (line.includes('is not defined') || line.includes('undefined')) {
        errors.push({
          file: filePath,
          line: lineNum,
          type: 'undefined variable',
          content: line.trim()
        });
      }
    });
    
  } catch (error) {
    errors.push({
      file: filePath,
      line: 0,
      type: 'file read error',
      content: error.message
    });
  }
  
  return errors;
}

async function checkFrontendErrors() {
  console.log('🔍 Analisando código do frontend para identificar erros...');
  
  const frontendDirs = [
    './frontend',
    './src',
    './app',
    './pages',
    './components',
    './utils',
    './lib'
  ];
  
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue'];
  let allFiles = [];
  
  // Buscar arquivos em todos os diretórios possíveis
  for (const dir of frontendDirs) {
    if (fs.existsSync(dir)) {
      console.log(`📁 Analisando diretório: ${dir}`);
      const files = findFiles(dir, extensions);
      allFiles = allFiles.concat(files);
    }
  }
  
  if (allFiles.length === 0) {
    console.log('⚠️ Nenhum arquivo frontend encontrado nos diretórios padrão');
    console.log('📋 Tentando buscar em todo o projeto...');
    
    // Buscar em todo o projeto (exceto node_modules)
    allFiles = findFiles('.', extensions).filter(file => 
      !file.includes('node_modules') && 
      !file.includes('.git') &&
      !file.includes('dist') &&
      !file.includes('build')
    );
  }
  
  console.log(`📊 Encontrados ${allFiles.length} arquivos para análise`);
  
  let totalErrors = 0;
  const errorsByType = {};
  const errorsByFile = {};
  
  for (const file of allFiles) {
    const errors = analyzeFile(file);
    
    if (errors.length > 0) {
      errorsByFile[file] = errors;
      totalErrors += errors.length;
      
      errors.forEach(error => {
        if (!errorsByType[error.type]) {
          errorsByType[error.type] = 0;
        }
        errorsByType[error.type]++;
      });
    }
  }
  
  console.log('\n📊 RELATÓRIO DE ANÁLISE DE CÓDIGO:');
  console.log('='.repeat(50));
  
  if (totalErrors > 0) {
    console.log(`\n🚨 ${totalErrors} possíveis problemas encontrados:`);
    
    console.log('\n📈 Por tipo:');
    Object.entries(errorsByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    console.log('\n📁 Por arquivo:');
    Object.entries(errorsByFile).forEach(([file, errors]) => {
      console.log(`\n   ${file} (${errors.length} problemas):`);
      errors.forEach((error, index) => {
        console.log(`     ${index + 1}. Linha ${error.line}: [${error.type}] ${error.content}`);
      });
    });
    
  } else {
    console.log('\n✅ Nenhum problema óbvio encontrado na análise estática!');
  }
  
  // Verificar logs de build/compilação
  console.log('\n📋 Verificando logs de build...');
  
  const logFiles = [
    './.nuxt/build.log',
    './build.log',
    './npm-debug.log',
    './yarn-error.log'
  ];
  
  for (const logFile of logFiles) {
    if (fs.existsSync(logFile)) {
      console.log(`📄 Analisando ${logFile}...`);
      try {
        const logContent = fs.readFileSync(logFile, 'utf8');
        const errorLines = logContent.split('\n').filter(line => 
          line.toLowerCase().includes('error') || 
          line.toLowerCase().includes('failed') ||
          line.toLowerCase().includes('warning')
        );
        
        if (errorLines.length > 0) {
          console.log(`   Encontrados ${errorLines.length} problemas:`);
          errorLines.slice(0, 10).forEach((line, index) => {
            console.log(`     ${index + 1}. ${line.trim()}`);
          });
          if (errorLines.length > 10) {
            console.log(`     ... e mais ${errorLines.length - 10} problemas`);
          }
        }
      } catch (error) {
        console.log(`   Erro ao ler ${logFile}: ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 RESUMO FINAL:');
  console.log(`Total de arquivos analisados: ${allFiles.length}`);
  console.log(`Total de problemas encontrados: ${totalErrors}`);
  
  return {
    totalFiles: allFiles.length,
    totalErrors,
    errorsByType,
    errorsByFile
  };
}

if (require.main === module) {
  checkFrontendErrors().catch(console.error);
}

module.exports = { checkFrontendErrors };