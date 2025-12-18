#!/usr/bin/env node

/**
 * Script de Monitoramento de Chunks JavaScript
 * Verifica se todos os chunks necessários foram gerados corretamente
 */

const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.join(__dirname, '../.next/static/chunks');
const BUILD_MANIFEST = path.join(__dirname, '../.next/build-manifest.json');

function checkChunksDirectory() {
  console.log('🔍 Verificando diretório de chunks...');
  
  if (!fs.existsSync(CHUNKS_DIR)) {
    console.error('❌ Diretório de chunks não encontrado:', CHUNKS_DIR);
    return false;
  }

  const files = fs.readdirSync(CHUNKS_DIR, { recursive: true });
  const jsFiles = files.filter(file => file.endsWith('.js'));
  
  console.log(`✅ Encontrados ${jsFiles.length} arquivos JavaScript`);
  console.log('📁 Chunks principais:');
  
  // Verificar chunks essenciais
  const essentialChunks = [
    'framework-',
    'main-app-',
    'main-',
    'webpack-',
    'polyfills-'
  ];

  let allEssentialFound = true;
  
  essentialChunks.forEach(chunk => {
    const found = jsFiles.some(file => file.includes(chunk));
    if (found) {
      console.log(`  ✅ ${chunk}*.js`);
    } else {
      console.log(`  ❌ ${chunk}*.js - AUSENTE`);
      allEssentialFound = false;
    }
  });

  return allEssentialFound;
}

function checkBuildManifest() {
  console.log('\n📋 Verificando build manifest...');
  
  if (!fs.existsSync(BUILD_MANIFEST)) {
    console.error('❌ Build manifest não encontrado');
    return false;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(BUILD_MANIFEST, 'utf8'));
    const pages = Object.keys(manifest.pages || {});
    
    console.log(`✅ Manifest válido com ${pages.length} páginas`);
    
    // Verificar se há páginas sem chunks
    const pagesWithoutChunks = pages.filter(page => {
      const chunks = manifest.pages[page];
      return !chunks || chunks.length === 0;
    });

    if (pagesWithoutChunks.length > 0) {
      console.warn('⚠️  Páginas sem chunks:', pagesWithoutChunks);
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao ler build manifest:', error.message);
    return false;
  }
}

function generateReport() {
  console.log('\n📊 Relatório de Chunks');
  console.log('='.repeat(50));
  
  const chunksOk = checkChunksDirectory();
  const manifestOk = checkBuildManifest();
  
  console.log('\n🎯 Resumo:');
  console.log(`Chunks: ${chunksOk ? '✅ OK' : '❌ PROBLEMA'}`);
  console.log(`Manifest: ${manifestOk ? '✅ OK' : '❌ PROBLEMA'}`);
  
  if (chunksOk && manifestOk) {
    console.log('\n🎉 Todos os chunks estão funcionando corretamente!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Problemas detectados. Execute um rebuild:');
    console.log('   npm run build && npm run start');
    process.exit(1);
  }
}

// Executar monitoramento
if (require.main === module) {
  generateReport();
}

module.exports = { checkChunksDirectory, checkBuildManifest };