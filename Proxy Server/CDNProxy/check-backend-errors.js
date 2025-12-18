const fs = require('fs');
const path = require('path');

console.log('🔍 Analisando código do backend para identificar erros...');

const backendDir = './backend';
const issues = [];

// Padrões de problemas a serem detectados
const patterns = {
  'console.error': /console\.error\s*\(/g,
  'console.log': /console\.log\s*\(/g,
  'throw error': /throw\s+(?:new\s+)?Error/g,
  'undefined variable': /(?:===|==|!==|!=)\s*undefined|undefined\s*(?:===|==|!==|!=)/g,
  'missing await': /(?:fetch|axios|supabase)\s*\([^)]*\)\s*(?!\.then|\.catch|await)/g,
  'hardcoded urls': /https?:\/\/(?:localhost|127\.0\.0\.1|api\.cdnproxy\.top|app\.cdnproxy\.top)/g,
  'missing error handling': /(?:fetch|axios)\s*\([^)]*\)(?!\s*\.(?:then|catch))/g,
  'deprecated methods': /findByIdAndUpdate|findOneAndUpdate|save\(\)/g
};

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      Object.entries(patterns).forEach(([type, pattern]) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            issues.push({
              file: filePath,
              line: index + 1,
              type,
              content: line.trim(),
              match
            });
          });
        }
      });
    });
  } catch (error) {
    console.error(`Erro ao analisar arquivo ${filePath}:`, error.message);
  }
}

function scanDirectory(dir) {
  const files = [];
  
  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.vue'))) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      console.error(`Erro ao escanear diretório ${currentDir}:`, error.message);
    }
  }
  
  scan(dir);
  return files;
}

// Analisar todos os arquivos
console.log(`📁 Analisando diretório: ${backendDir}`);
const files = scanDirectory(backendDir);
console.log(`📊 Encontrados ${files.length} arquivos para análise`);

files.forEach(analyzeFile);

// Gerar relatório
console.log('\n📊 RELATÓRIO DE ANÁLISE DE CÓDIGO DO BACKEND:');
console.log('==================================================');

if (issues.length === 0) {
  console.log('✅ Nenhum problema encontrado!');
} else {
  console.log(`\n🚨 ${issues.length} possíveis problemas encontrados:\n`);
  
  // Agrupar por tipo
  const byType = {};
  issues.forEach(issue => {
    if (!byType[issue.type]) byType[issue.type] = 0;
    byType[issue.type]++;
  });
  
  console.log('📈 Por tipo:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  // Agrupar por arquivo
  const byFile = {};
  issues.forEach(issue => {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  });
  
  console.log('\n📁 Por arquivo:\n');
  Object.entries(byFile).forEach(([file, fileIssues]) => {
    console.log(`   ${file} (${fileIssues.length} problemas):`);
    fileIssues.forEach((issue, index) => {
      console.log(`     ${index + 1}. Linha ${issue.line}: [${issue.type}] ${issue.content}`);
    });
    console.log('');
  });
}

// Verificar arquivos de configuração críticos
console.log('\n🔧 VERIFICAÇÃO DE ARQUIVOS DE CONFIGURAÇÃO:');
console.log('=============================================');

const configFiles = [
  './backend/nuxt.config.ts',
  './backend/package.json',
  './backend/tsconfig.json',
  './.env.production'
];

configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - Existe`);
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (file.endsWith('.json')) {
        JSON.parse(content);
        console.log(`   ✅ JSON válido`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  } else {
    console.log(`❌ ${file} - Não encontrado`);
  }
});

// Verificar estrutura de APIs
console.log('\n🌐 VERIFICAÇÃO DE ESTRUTURA DE APIs:');
console.log('===================================');

const apiDir = './backend/server/api';
if (fs.existsSync(apiDir)) {
  function listApis(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        console.log(`📁 ${prefix}/${item}/`);
        listApis(fullPath, `${prefix}/${item}`);
      } else if (item.endsWith('.ts') || item.endsWith('.js')) {
        const method = item.split('.')[1] || 'unknown';
        console.log(`   🔗 ${method.toUpperCase()} ${prefix}/${item.replace(/\.(get|post|put|delete|patch)\.ts$/, '')}`);
      }
    });
  }
  
  listApis(apiDir);
} else {
  console.log('❌ Diretório de APIs não encontrado');
}

console.log('\n✅ Análise concluída!');