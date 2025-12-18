#!/usr/bin/env node

/**
 * Script de Verificação de Headers de Cache
 * Testa se os headers de cache estão sendo aplicados corretamente
 */

const http = require('http');
const https = require('https');
const url = require('url');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ricardtech.top';

const TEST_ROUTES = [
  // Assets estáticos (usar nomes reais dos chunks)
  '/_next/static/chunks/framework-0907bc41f77e1d3c.js',
  '/_next/static/chunks/main-e1d486e1c371ce60.js',
  '/_next/static/chunks/webpack-265f433f4451e7d3.js',
  
  // Páginas HTML
  '/',
  '/login',
  '/admin',
  
  // APIs
  '/api/health',
  '/api/auth/session'
];

function makeRequest(testUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(testUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: 'HEAD',
      timeout: 5000
    };

    const req = client.request(options, (res) => {
      resolve({
        url: testUrl,
        status: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

function analyzeHeaders(response) {
  const { url: testUrl, status, headers } = response;
  const analysis = {
    url: testUrl,
    status,
    cacheControl: headers['cache-control'] || 'não definido',
    etag: headers['etag'] || 'não definido',
    lastModified: headers['last-modified'] || 'não definido',
    expires: headers['expires'] || 'não definido'
  };

  // Verificar se é asset estático
  if (testUrl.includes('/_next/static/')) {
    analysis.expectedCache = 'max-age=31536000, immutable';
    analysis.isCorrect = headers['cache-control']?.includes('max-age=31536000');
  } 
  // Verificar se é página HTML
  else if (!testUrl.includes('/api/')) {
    analysis.expectedCache = 'no-cache, no-store, must-revalidate';
    analysis.isCorrect = headers['cache-control']?.includes('no-cache');
  }
  // Verificar se é API
  else {
    analysis.expectedCache = 'no-cache, no-store, must-revalidate';
    analysis.isCorrect = headers['cache-control']?.includes('no-cache');
  }

  return analysis;
}

async function testCacheHeaders() {
  console.log('🔍 Testando Headers de Cache');
  console.log('='.repeat(50));
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = [];
  
  for (const route of TEST_ROUTES) {
    const testUrl = `${BASE_URL}${route}`;
    
    try {
      console.log(`Testando: ${route}`);
      const response = await makeRequest(testUrl);
      const analysis = analyzeHeaders(response);
      results.push(analysis);
      
      const status = analysis.isCorrect ? '✅' : '⚠️';
      console.log(`  ${status} Status: ${analysis.status}`);
      console.log(`  ${status} Cache-Control: ${analysis.cacheControl}`);
      console.log(`  ${status} Esperado: ${analysis.expectedCache}\n`);
      
    } catch (error) {
      console.log(`  ❌ Erro: ${error.message}\n`);
      results.push({
        url: testUrl,
        error: error.message
      });
    }
  }

  return results;
}

function generateCacheReport(results) {
  console.log('📊 Relatório de Cache Headers');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => !r.error && r.isCorrect);
  const failed = results.filter(r => r.error || !r.isCorrect);
  
  console.log(`✅ Corretos: ${successful.length}`);
  console.log(`❌ Problemas: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n⚠️  URLs com problemas:');
    failed.forEach(result => {
      if (result.error) {
        console.log(`  - ${result.url}: ${result.error}`);
      } else {
        console.log(`  - ${result.url}: Cache incorreto`);
        console.log(`    Atual: ${result.cacheControl}`);
        console.log(`    Esperado: ${result.expectedCache}`);
      }
    });
  }
  
  console.log('\n💡 Dicas:');
  console.log('  - Assets estáticos devem ter cache longo (1 ano)');
  console.log('  - Páginas HTML devem ter no-cache');
  console.log('  - APIs devem ter no-cache');
  
  return failed.length === 0;
}

// Executar verificação
if (require.main === module) {
  testCacheHeaders()
    .then(generateCacheReport)
    .then(success => {
      if (success) {
        console.log('\n🎉 Todos os headers de cache estão corretos!');
        process.exit(0);
      } else {
        console.log('\n⚠️  Alguns headers precisam de ajuste.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Erro durante verificação:', error);
      process.exit(1);
    });
}

module.exports = { testCacheHeaders, analyzeHeaders };