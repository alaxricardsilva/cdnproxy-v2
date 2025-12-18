const https = require('https');
const http = require('http');

// Configurações
const DOMAINS = {
  frontend: 'https://app.cdnproxy.top',
  backend: 'https://api.cdnproxy.top',
  proxy: 'https://test.cdnproxy.top:8080'
};

const CREDENTIALS = {
  superadmin: {
    email: 'alaxricardsilva@gmail.com',
    password: 'Admin123'
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
        'User-Agent': 'ProxyCDN-Test/1.0',
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

// Teste de conectividade básica
async function testConnectivity() {
  console.log('🔗 TESTE DE CONECTIVIDADE');
  console.log('='.repeat(40));
  
  const results = {};
  
  for (const [name, url] of Object.entries(DOMAINS)) {
    try {
      console.log(`📋 Testando ${name}: ${url}`);
      const start = Date.now();
      const response = await makeRequest(url);
      const duration = Date.now() - start;
      
      results[name] = {
        status: response.status,
        duration,
        success: response.status < 400
      };
      
      console.log(`   Status: ${response.status} (${duration}ms)`);
      
    } catch (error) {
      results[name] = {
        status: 'ERROR',
        duration: 0,
        success: false,
        error: error.message
      };
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
  
  return results;
}

// Teste de autenticação
async function testAuthentication() {
  console.log('\n🔐 TESTE DE AUTENTICAÇÃO');
  console.log('='.repeat(40));
  
  try {
    console.log('📋 Fazendo login como superadmin...');
    const loginResponse = await makeRequest(`${DOMAINS.backend}/api/auth/login`, {
      method: 'POST',
      body: CREDENTIALS.superadmin
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200 && loginResponse.data?.access_token) {
      console.log('   ✅ Login bem-sucedido');
      
      const token = loginResponse.data.access_token;
      
      // Testar endpoints protegidos
      const protectedEndpoints = [
        '/api/superadmin/system/services',
        '/api/superadmin/system-health',
        '/api/superadmin/performance',
        '/api/superadmin/ip-cache'
      ];
      
      console.log('\n📋 Testando endpoints protegidos...');
      
      for (const endpoint of protectedEndpoints) {
        try {
          const response = await makeRequest(`${DOMAINS.backend}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log(`   ${endpoint}: ${response.status}`);
          
          if (response.status === 401) {
            console.log('     ⚠️ Token rejeitado');
          } else if (response.status === 200) {
            console.log('     ✅ Acesso autorizado');
          }
          
        } catch (error) {
          console.log(`   ${endpoint}: ❌ ${error.message}`);
        }
      }
      
      return { success: true, token };
      
    } else {
      console.log('   ❌ Falha no login');
      console.log(`   Resposta: ${JSON.stringify(loginResponse.data)}`);
      return { success: false };
    }
    
  } catch (error) {
    console.log(`   ❌ Erro durante autenticação: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Teste de funcionalidades principais
async function testMainFeatures(token) {
  console.log('\n⚙️ TESTE DE FUNCIONALIDADES PRINCIPAIS');
  console.log('='.repeat(40));
  
  if (!token) {
    console.log('❌ Token não disponível, pulando testes de funcionalidades');
    return;
  }
  
  const features = [
    {
      name: 'System Health',
      endpoint: '/api/superadmin/system-health',
      expectedFields: ['database', 'redis', 'cdn']
    },
    {
      name: 'Performance Metrics',
      endpoint: '/api/superadmin/performance',
      expectedFields: ['cpu', 'memory', 'disk']
    },
    {
      name: 'IP Cache',
      endpoint: '/api/superadmin/ip-cache',
      expectedFields: ['data']
    }
  ];
  
  for (const feature of features) {
    try {
      console.log(`📋 Testando ${feature.name}...`);
      
      const response = await makeRequest(`${DOMAINS.backend}${feature.endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        const hasExpectedFields = feature.expectedFields.every(field => 
          response.data && (field in response.data || (response.data.data && field in response.data.data))
        );
        
        if (hasExpectedFields) {
          console.log('   ✅ Estrutura de resposta correta');
        } else {
          console.log('   ⚠️ Estrutura de resposta inesperada');
          console.log(`   Campos esperados: ${feature.expectedFields.join(', ')}`);
          console.log(`   Resposta: ${JSON.stringify(response.data).substring(0, 200)}...`);
        }
      } else {
        console.log(`   ❌ Falha na requisição`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  }
}

// Teste de performance
async function testPerformance() {
  console.log('\n⚡ TESTE DE PERFORMANCE');
  console.log('='.repeat(40));
  
  const endpoints = [
    `${DOMAINS.frontend}`,
    `${DOMAINS.backend}/api/health`,
    `${DOMAINS.proxy}/health`
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📋 Testando performance: ${endpoint}`);
    
    const times = [];
    const requests = 5;
    
    for (let i = 0; i < requests; i++) {
      try {
        const start = Date.now();
        await makeRequest(endpoint);
        const duration = Date.now() - start;
        times.push(duration);
      } catch (error) {
        console.log(`   ❌ Erro na requisição ${i + 1}: ${error.message}`);
      }
    }
    
    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.log(`   Média: ${avg.toFixed(2)}ms | Min: ${min}ms | Max: ${max}ms`);
      
      if (avg > 5000) {
        console.log('   ⚠️ Resposta lenta (>5s)');
      } else if (avg > 2000) {
        console.log('   ⚠️ Resposta moderada (>2s)');
      } else {
        console.log('   ✅ Resposta rápida');
      }
    }
  }
}

// Teste de segurança básica
async function testSecurity() {
  console.log('\n🔒 TESTE DE SEGURANÇA BÁSICA');
  console.log('='.repeat(40));
  
  // Teste de endpoints sem autenticação
  const protectedEndpoints = [
    '/api/superadmin/system/services',
    '/api/superadmin/system-health',
    '/api/admin/domains'
  ];
  
  console.log('📋 Testando acesso não autorizado...');
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await makeRequest(`${DOMAINS.backend}${endpoint}`);
      
      if (response.status === 401 || response.status === 403) {
        console.log(`   ${endpoint}: ✅ Protegido (${response.status})`);
      } else {
        console.log(`   ${endpoint}: ⚠️ Possível falha de segurança (${response.status})`);
      }
      
    } catch (error) {
      console.log(`   ${endpoint}: ❌ ${error.message}`);
    }
  }
  
  // Teste de headers de segurança
  console.log('\n📋 Verificando headers de segurança...');
  
  try {
    const response = await makeRequest(DOMAINS.frontend);
    const headers = response.headers;
    
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    securityHeaders.forEach(header => {
      if (headers[header]) {
        console.log(`   ${header}: ✅ Presente`);
      } else {
        console.log(`   ${header}: ⚠️ Ausente`);
      }
    });
    
  } catch (error) {
    console.log(`   ❌ Erro ao verificar headers: ${error.message}`);
  }
}

// Função principal
async function runDetailedTests() {
  console.log('🚀 INICIANDO TESTES DETALHADOS EM PRODUÇÃO');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // 1. Teste de conectividade
    const connectivityResults = await testConnectivity();
    
    // 2. Teste de autenticação
    const authResults = await testAuthentication();
    
    // 3. Teste de funcionalidades principais
    if (authResults.success && authResults.token) {
      await testMainFeatures(authResults.token);
    }
    
    // 4. Teste de performance
    await testPerformance();
    
    // 5. Teste de segurança
    await testSecurity();
    
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('='.repeat(40));
    
    const totalDomains = Object.keys(DOMAINS).length;
    const successfulDomains = Object.values(connectivityResults).filter(r => r.success).length;
    
    console.log(`Conectividade: ${successfulDomains}/${totalDomains} domínios OK`);
    console.log(`Autenticação: ${authResults.success ? '✅ OK' : '❌ FALHA'}`);
    
    if (successfulDomains < totalDomains || !authResults.success) {
      console.log('\n⚠️ PROBLEMAS IDENTIFICADOS - REQUER ATENÇÃO');
    } else {
      console.log('\n✅ TODOS OS TESTES PRINCIPAIS PASSARAM');
    }
    
  } catch (error) {
    console.error('❌ Erro durante execução dos testes:', error.message);
  }
}

if (require.main === module) {
  runDetailedTests().catch(console.error);
}

module.exports = { runDetailedTests };