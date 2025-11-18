// check-jsx-errors.js
// Script para identificar erros de sintaxe (JSX/TS) em todos os arquivos .tsx do projeto

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');

const SRC_DIR = path.join(__dirname, 'src', 'app');

function getAllTsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsxFiles(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  return results;
}

function checkFileSyntax(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
    return null;
  } catch (err) {
    return err;
  }
}

function main() {
  const files = getAllTsxFiles(SRC_DIR);
  let hasError = false;
  console.log('Verificando arquivos .tsx em:', SRC_DIR);
  files.forEach(file => {
    const err = checkFileSyntax(file);
    if (err) {
      hasError = true;
      console.log(`\nErro em: ${file}`);
      console.log(`Mensagem: ${err.message}`);
      if (err.loc) {
        console.log(`Linha: ${err.loc.line}, Coluna: ${err.loc.column}`);
      }
    }
  });
  if (!hasError) {
    console.log('\nNenhum erro de sintaxe encontrado!');
  }
}

main();