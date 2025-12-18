const https = require('https');
const http = require('http');

console.log('🔍 DIAGNÓSTICO DO SISTEMA DE AUTENTICAÇÃO');
console.log('========================================');

// Configurações
const config = {
  domains: {
    frontend: 'https://app.cdnproxy.top',
    backend: 'https://api.cdnproxy.top'
  },
  credentials: {
    superadmin: {
      email: 'alaxricardsilva@gmail.com',
      password: 'Admin123'
    },
    admin: {
      email: 'alaxricardsilva@outlook.com', 
      password: 'Admin123'
    }
  }
};

// Função para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CDN-Proxy-Debug/1.0',
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
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            rawData: data
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

// Função para aguardar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para testar endpoint de saúde
async function testHealthEndpoints() {
  console.log('\n🏥 TESTANDO ENDPOINTS DE SAÚDE:');
  console.log('==============================');
  
  const endpoints = [
    `${config.domains.backend}/api/health`,
    `${config.domains.backend}/api/system/health`,
    `${config.domains.frontend}`,
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testando: ${endpoint}`);
      const response = await makeRequest(endpoint);
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
      
      if (typeof response.data === 'object') {
        console.log(`   Dados: ${JSON.stringify(response.data, null, 2)}`);
      } else {
        console.log(`   Dados: ${response.data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    
    await sleep(500);
  }
}

// Função para testar diferentes métodos de login
async function testLoginMethods() {
  console.log('\n🔐 TESTANDO MÉTODOS DE LOGIN:');
  console.log('============================');
  
  const loginEndpoints = [
    '/api/auth/login',
    '/api/auth/signin',
    '/auth/login'
  ];
  
  for (const endpoint of loginEndpoints) {
    console.log(`\n🔍 Testando endpoint: ${endpoint}`);
    
    for (const [userType, credentials] of Object.entries(config.credentials)) {
      try {
        console.log(`   👤 Testando ${userType}...`);
        
        const response = await makeRequest(`${config.domains.backend}${endpoint}`, {
          method: 'POST',
          body: credentials
        });
        
        console.log(`      Status: ${response.status}`);
        
        if (response.data) {
          if (typeof response.data === 'object') {
            console.log(`      Resposta: ${JSON.stringify(response.data, null, 2)}`);
            
            // Verificar se há token
            if (response.data.token || response.data.access_token) {
              const token = response.data.token || response.data.access_token;
              console.log(`      ✅ Token encontrado: ${token.substring(0, 50)}...`);
              
              // Testar token
              await testTokenValidation(token, userType);
            }
          } else {
            console.log(`      Resposta: ${response.data}`);
          }
        }
        
      } catch (error) {
        console.log(`      ❌ Erro: ${error.message}`);
      }
      
      await sleep(300);
    }
  }
}

// Função para testar validação de token
async function testTokenValidation(token, userType) {
  console.log(`\n🎫 TESTANDO VALIDAÇÃO DE TOKEN (${userType}):`);
  console.log('==========================================');
  
  const protectedEndpoints = [
    '/api/auth/me',
    '/api/auth/profile',
    '/api/admin/profile',
    '/api/superadmin/profile'
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      console.log(`   🔍 Testando: ${endpoint}`);
      
      const response = await makeRequest(`${config.domains.backend}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`      Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`      ✅ Token válido para ${endpoint}`);
        if (response.data && typeof response.data === 'object') {
          console.log(`      Dados: ${JSON.stringify(response.data, null, 2)}`);
        }
      } else {
        console.log(`      ❌ Token inválido ou endpoint protegido`);
        if (response.data) {
          console.log(`      Erro: ${JSON.stringify(response.data, null, 2)}`);
        }
      }
      
    } catch (error) {
      console.log(`      ❌ Erro: ${error.message}`);
    }
    
    await sleep(200);
  }
}

// Função para testar estrutura de APIs
async function testAPIStructure() {
  console.log('\n🏗️  TESTANDO ESTRUTURA DE APIs:');
  console.log('==============================');
  
  const apiEndpoints = [
    '/api',
    '/api/auth',
    '/api/admin',
    '/api/superadmin',
    '/api/system'
  ];
  
  for (const endpoint of apiEndpoints) {
    try {
      console.log(`\n🔍 Testando: ${endpoint}`);
      
      const response = await makeRequest(`${config.domains.backend}${endpoint}`);
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 404) {
        console.log(`   ⚠️  Endpoint não encontrado`);
      } else if (response.status === 401) {
        console.log(`   🔒 Endpoint protegido (requer autenticação)`);
      } else if (response.status === 200) {
        console.log(`   ✅ Endpoint acessível`);
      } else {
        console.log(`   ❓ Status inesperado: ${response.status}`);
      }
      
      if (response.data && typeof response.data === 'object') {
        console.log(`   Dados: ${JSON.stringify(response.data, null, 2)}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    
    await sleep(300);
  }
}

// Função para testar configuração CORS
async function testCORS() {
  console.log('\n🌐 TESTANDO CONFIGURAÇÃO CORS:');
  console.log('=============================');
  
  try {
    const response = await makeRequest(`${config.domains.backend}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': config.domains.frontend,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers CORS:`);
    
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials'
    ];
    
    corsHeaders.forEach(header => {
      if (response.headers[header]) {
        console.log(`   ${header}: ${response.headers[header]}`);
      } else {
        console.log(`   ❌ ${header}: não encontrado`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Erro ao testar CORS: ${error.message}`);
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando diagnóstico do sistema de autenticação...\n');
  
  // Testar endpoints de saúde
  await testHealthEndpoints();
  
  // Testar estrutura de APIs
  await testAPIStructure();
  
  // Testar CORS
  await testCORS();
  
  // Testar métodos de login
  await testLoginMethods();
  
  console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
  console.log('========================');
  console.log('✅ Diagnóstico concluído!');
  console.log('\n📋 RECOMENDAÇÕES:');
  console.log('- Verificar se o endpoint de login está correto');
  console.log('- Validar se o token JWT está sendo gerado corretamente');
  console.log('- Confirmar se os middlewares de autenticação estão funcionando');
  console.log('- Testar se as roles estão sendo validadas corretamente');
}

// Executar diagnóstico
main().catch(error => {
  console.error('❌ Erro durante o diagnóstico:', error);
  process.exit(1);
});