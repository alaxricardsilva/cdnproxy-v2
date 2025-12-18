#!/usr/bin/env node

const https = require('https');

// Função para fazer requisições HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ProxyCDN-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: 10000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Função para aguardar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para verificar rate limit headers
async function checkRateLimitStatus() {
  console.log('🔍 Verificando status do rate limiting...');
  
  try {
    const response = await makeRequest('https://api.cdnproxy.top/api/health');
    
    console.log(`Status: ${response.status}`);
    
    // Verificar headers de rate limiting
    const rateLimitHeaders = {};
    Object.keys(response.headers).forEach(key => {
      if (key.toLowerCase().includes('ratelimit') || key.toLowerCase().includes('rate-limit')) {
        rateLimitHeaders[key] = response.headers[key];
      }
    });
    
    if (Object.keys(rateLimitHeaders).length > 0) {
      console.log('Rate Limit Headers:', rateLimitHeaders);
      
      // Calcular tempo até reset
      const resetHeader = rateLimitHeaders['x-ratelimit-reset'] || rateLimitHeaders['X-RateLimit-Reset'];
      if (resetHeader) {
        const resetTime = parseInt(resetHeader) * 1000; // Converter para ms
        const now = Date.now();
        const timeUntilReset = Math.max(0, resetTime - now);
        
        console.log(`Tempo até reset: ${Math.ceil(timeUntilReset / 1000)} segundos`);
        return timeUntilReset;
      }
    } else {
      console.log('Nenhum header de rate limiting encontrado');
    }
    
    return 0;
  } catch (error) {
    console.log(`Erro ao verificar rate limit: ${error.message}`);
    return 0;
  }
}

// Função para testar login específico
async function testLogin() {
  console.log('\n🧪 Testando login após aguardar...');
  
  try {
    const response = await makeRequest('https://api.cdnproxy.top/api/auth/login', {
      method: 'POST',
      body: {
        email: 'alaxricardsilva@gmail.com',
        password: 'Admin123'
      }
    });
    
    console.log(`Status do login: ${response.status}`);
    
    if (response.status === 429) {
      console.log('❌ Ainda bloqueado por rate limiting');
      return false;
    } else if (response.status === 200) {
      console.log('✅ Login funcionando normalmente');
      return true;
    } else {
      console.log(`⚠️ Status inesperado: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro no teste de login: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 AGUARDANDO RESET DO RATE LIMITING');
  console.log('='.repeat(50));
  
  // Verificar status atual
  const timeUntilReset = await checkRateLimitStatus();
  
  if (timeUntilReset > 0) {
    console.log(`\n⏳ Aguardando ${Math.ceil(timeUntilReset / 1000)} segundos para reset...`);
    await sleep(timeUntilReset + 5000); // Aguardar + 5 segundos de margem
  } else {
    console.log('\n⏳ Aguardando 60 segundos por segurança...');
    await sleep(60000); // Aguardar 1 minuto por segurança
  }
  
  // Testar se o login está funcionando
  const loginWorking = await testLogin();
  
  if (loginWorking) {
    console.log('\n🎉 Rate limiting resetado! Pode executar os testes agora.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Rate limiting ainda ativo. Aguardando mais 2 minutos...');
    await sleep(120000); // Aguardar mais 2 minutos
    
    const secondTest = await testLogin();
    if (secondTest) {
      console.log('\n🎉 Rate limiting resetado após aguardar mais tempo!');
      process.exit(0);
    } else {
      console.log('\n❌ Rate limiting ainda ativo após aguardar. Pode haver um problema.');
      process.exit(1);
    }
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});