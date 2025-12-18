const https = require('https');

// Função para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : require('http');
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ProxyCDN-AuthFix/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Função para aguardar um tempo
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function investigateAuthIssue() {
  console.log('🔍 INVESTIGANDO PROBLEMA DE AUTENTICAÇÃO');
  console.log('='.repeat(50));
  
  const baseUrl = 'https://api.cdnproxy.top';
  const credentials = {
    email: 'alaxricardsilva@gmail.com',
    password: 'Admin123'
  };
  
  // 1. Verificar se o endpoint de login está funcionando
  console.log('📋 1. Verificando endpoint de login...');
  
  try {
    const loginResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: credentials
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Headers: ${JSON.stringify(loginResponse.headers, null, 2)}`);
    
    if (loginResponse.status === 429) {
      console.log('   ⚠️ Rate limit detectado. Aguardando...');
      
      // Verificar header de retry-after
      const retryAfter = loginResponse.headers['retry-after'] || loginResponse.headers['x-ratelimit-reset'];
      if (retryAfter) {
        console.log(`   Retry-After: ${retryAfter} segundos`);
        const waitTime = parseInt(retryAfter) * 1000;
        console.log(`   Aguardando ${waitTime/1000} segundos...`);
        await sleep(waitTime);
      } else {
        console.log('   Aguardando 60 segundos por precaução...');
        await sleep(60000);
      }
      
      // Tentar novamente
      console.log('   Tentando login novamente...');
      const retryResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        body: credentials
      });
      
      console.log(`   Status (retry): ${retryResponse.status}`);
      
      if (retryResponse.status === 200) {
        console.log('   ✅ Login bem-sucedido após aguardar rate limit');
        return retryResponse.data;
      } else {
        console.log(`   ❌ Login ainda falhando: ${JSON.stringify(retryResponse.data)}`);
        return null;
      }
      
    } else if (loginResponse.status === 200) {
      console.log('   ✅ Login bem-sucedido');
      return loginResponse.data;
      
    } else {
      console.log(`   ❌ Falha no login: ${JSON.stringify(loginResponse.data)}`);
      
      // Verificar se é problema de credenciais
      if (loginResponse.status === 401) {
        console.log('   🔍 Investigando problema de credenciais...');
        
        // Tentar com credenciais diferentes para teste
        const testCredentials = [
          { email: 'alaxricardsilva@outlook.com', password: 'Admin123' },
          { email: 'test@cdnproxy.top', password: 'test123' }
        ];
        
        for (const testCred of testCredentials) {
          console.log(`   Testando com: ${testCred.email}`);
          const testResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            body: testCred
          });
          console.log(`     Status: ${testResponse.status}`);
          
          if (testResponse.status === 200) {
            console.log(`     ✅ Credenciais alternativas funcionam: ${testCred.email}`);
            break;
          }
        }
      }
      
      return null;
    }
    
  } catch (error) {
    console.log(`   ❌ Erro na requisição: ${error.message}`);
    return null;
  }
}

async function checkRateLimiting() {
  console.log('\n🚦 VERIFICANDO CONFIGURAÇÕES DE RATE LIMITING');
  console.log('='.repeat(50));
  
  const baseUrl = 'https://api.cdnproxy.top';
  
  // Fazer várias requisições para testar rate limiting
  console.log('📋 Fazendo múltiplas requisições para testar rate limiting...');
  
  for (let i = 1; i <= 5; i++) {
    try {
      const start = Date.now();
      const response = await makeRequest(`${baseUrl}/api/health`);
      const duration = Date.now() - start;
      
      console.log(`   Requisição ${i}: Status ${response.status} (${duration}ms)`);
      
      // Verificar headers de rate limiting
      const rateLimitHeaders = {};
      Object.keys(response.headers).forEach(key => {
        if (key.toLowerCase().includes('ratelimit') || key.toLowerCase().includes('rate-limit')) {
          rateLimitHeaders[key] = response.headers[key];
        }
      });
      
      if (Object.keys(rateLimitHeaders).length > 0) {
        console.log(`     Rate Limit Headers:`, rateLimitHeaders);
      }
      
      // Aguardar um pouco entre requisições
      await sleep(1000);
      
    } catch (error) {
      console.log(`   Requisição ${i}: ❌ ${error.message}`);
    }
  }
}

async function checkAuthEndpoints() {
  console.log('\n🔐 VERIFICANDO ENDPOINTS DE AUTENTICAÇÃO');
  console.log('='.repeat(50));
  
  const baseUrl = 'https://api.cdnproxy.top';
  const endpoints = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/me'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📋 Testando ${endpoint}...`);
      
      const response = await makeRequest(`${baseUrl}${endpoint}`, {
        method: endpoint === '/api/auth/login' ? 'POST' : 'GET',
        body: endpoint === '/api/auth/login' ? { email: 'test@test.com', password: 'test' } : undefined
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 405) {
        console.log('   ℹ️ Método não permitido (esperado para alguns endpoints)');
      } else if (response.status === 401) {
        console.log('   ℹ️ Não autorizado (esperado para endpoints protegidos)');
      } else if (response.status === 429) {
        console.log('   ⚠️ Rate limit ativo');
      } else {
        console.log(`   Resposta: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
}

async function runAuthFix() {
  console.log('🚀 INICIANDO CORREÇÃO DE PROBLEMAS DE AUTENTICAÇÃO');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // 1. Investigar problema de autenticação
    const authData = await investigateAuthIssue();
    
    // 2. Verificar rate limiting
    await checkRateLimiting();
    
    // 3. Verificar endpoints de autenticação
    await checkAuthEndpoints();
    
    console.log('\n📊 RESUMO DA INVESTIGAÇÃO');
    console.log('='.repeat(40));
    
    if (authData) {
      console.log('✅ Autenticação funcionando');
      console.log(`Token obtido: ${authData.access_token ? 'Sim' : 'Não'}`);
      console.log(`Usuário: ${authData.user?.email || 'N/A'}`);
      console.log(`Role: ${authData.user?.user_metadata?.role || 'N/A'}`);
    } else {
      console.log('❌ Problema de autenticação confirmado');
      console.log('Possíveis causas:');
      console.log('- Rate limiting muito restritivo');
      console.log('- Credenciais inválidas');
      console.log('- Problema no servidor de autenticação');
      console.log('- Configuração incorreta do Supabase');
    }
    
  } catch (error) {
    console.error('❌ Erro durante investigação:', error.message);
  }
}

if (require.main === module) {
  runAuthFix().catch(console.error);
}

module.exports = { runAuthFix };