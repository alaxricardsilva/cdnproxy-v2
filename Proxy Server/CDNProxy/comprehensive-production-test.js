const https = require('https');
const http = require('http');

console.log('🧪 TESTE ABRANGENTE DO SISTEMA EM PRODUÇÃO');
console.log('==========================================');

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
        'User-Agent': 'CDN-Proxy-Test/1.0',
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
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
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

// Função para fazer login
async function login(credentials, userType) {
  console.log(`\n🔐 Fazendo login como ${userType}...`);
  
  try {
    const response = await makeRequest(`${config.domains.backend}/api/auth/login`, {
      method: 'POST',
      body: credentials
    });
    
    if (response.status === 200 && response.data.token) {
      console.log(`   ✅ Login ${userType} bem-sucedido`);
      console.log(`   📋 Token: ${response.data.token.substring(0, 20)}...`);
      console.log(`   👤 Usuário: ${response.data.user?.email}`);
      console.log(`   🎭 Role: ${response.data.user?.role}`);
      return {
        token: response.data.token,
        user: response.data.user
      };
    } else {
      console.log(`   ❌ Falha no login ${userType}:`, response.status, response.data);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Erro no login ${userType}:`, error.message);
    return null;
  }
}

// Função para testar endpoint
async function testEndpoint(url, token, method = 'GET', body = null, expectedStatus = 200) {
  try {
    const response = await makeRequest(url, {
      method,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body
    });
    
    const success = response.status === expectedStatus;
    const statusIcon = success ? '✅' : '❌';
    
    console.log(`   ${statusIcon} ${method} ${url.replace(config.domains.backend, '')} - ${response.status}`);
    
    if (!success) {
      console.log(`      Esperado: ${expectedStatus}, Recebido: ${response.status}`);
      if (response.data && typeof response.data === 'object') {
        console.log(`      Erro: ${response.data.message || JSON.stringify(response.data)}`);
      }
    }
    
    return { success, response };
  } catch (error) {
    console.log(`   ❌ ${method} ${url.replace(config.domains.backend, '')} - ERRO: ${error.message}`);
    return { success: false, error };
  }
}

// Função para testar APIs do SUPERADMIN
async function testSuperAdminAPIs(auth) {
  console.log('\n🔧 TESTANDO APIs DO SUPERADMIN:');
  console.log('==============================');
  
  const endpoints = [
    // Sistema
    { url: '/api/system/health', method: 'GET' },
    { url: '/api/superadmin/system-health', method: 'GET' },
    { url: '/api/superadmin/system-stats', method: 'GET' },
    { url: '/api/superadmin/dashboard', method: 'GET' },
    
    // Usuários
    { url: '/api/superadmin/users', method: 'GET' },
    { url: '/api/superadmin/admins', method: 'GET' },
    
    // Domínios
    { url: '/api/superadmin/domains', method: 'GET' },
    
    // Planos
    { url: '/api/superadmin/plans', method: 'GET' },
    
    // Servidores
    { url: '/api/superadmin/servers', method: 'GET' },
    
    // Analytics
    { url: '/api/superadmin/analytics', method: 'GET' },
    { url: '/api/superadmin/traffic', method: 'GET' },
    { url: '/api/superadmin/traffic-stats', method: 'GET' },
    
    // Logs e Auditoria
    { url: '/api/superadmin/audit-logs', method: 'GET' },
    { url: '/api/superadmin/security-logs', method: 'GET' },
    { url: '/api/superadmin/system-logs', method: 'GET' },
    
    // Backups
    { url: '/api/superadmin/backups', method: 'GET' },
    
    // Configurações
    { url: '/api/superadmin/settings', method: 'GET' },
    
    // Perfil
    { url: '/api/superadmin/profile', method: 'GET' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(
      `${config.domains.backend}${endpoint.url}`,
      auth.token,
      endpoint.method
    );
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    await sleep(100); // Evitar rate limiting
  }
  
  console.log(`\n📊 Resultado SUPERADMIN: ${passed} passou, ${failed} falhou`);
  return { passed, failed };
}

// Função para testar APIs do ADMIN
async function testAdminAPIs(auth) {
  console.log('\n👤 TESTANDO APIs DO ADMIN:');
  console.log('=========================');
  
  const endpoints = [
    // Perfil
    { url: '/api/admin/profile', method: 'GET' },
    
    // Domínios
    { url: '/api/admin/domains', method: 'GET' },
    
    // Analytics
    { url: '/api/admin/analytics', method: 'GET' },
    
    // Notificações
    { url: '/api/admin/notifications', method: 'GET' },
    
    // Pagamentos
    { url: '/api/admin/payments', method: 'GET' },
    
    // Carrinho
    { url: '/api/admin/cart', method: 'GET' },
    
    // Planos
    { url: '/api/plans', method: 'GET' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(
      `${config.domains.backend}${endpoint.url}`,
      auth.token,
      endpoint.method
    );
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    await sleep(100); // Evitar rate limiting
  }
  
  console.log(`\n📊 Resultado ADMIN: ${passed} passou, ${failed} falhou`);
  return { passed, failed };
}

// Função para testar domínios de produção
async function testProductionDomains() {
  console.log('\n🌐 TESTANDO DOMÍNIOS DE PRODUÇÃO:');
  console.log('================================');
  
  const tests = [
    { name: 'Frontend (app.cdnproxy.top)', url: config.domains.frontend },
    { name: 'Backend Health (api.cdnproxy.top)', url: `${config.domains.backend}/api/health` },
    { name: 'Backend System (api.cdnproxy.top)', url: `${config.domains.backend}/api/system/health` }
  ];
  
  for (const test of tests) {
    try {
      const response = await makeRequest(test.url);
      const success = response.status >= 200 && response.status < 400;
      const statusIcon = success ? '✅' : '❌';
      
      console.log(`   ${statusIcon} ${test.name} - ${response.status}`);
      
      if (test.url.includes('/health')) {
        console.log(`      Status: ${response.data?.status || 'N/A'}`);
        console.log(`      Uptime: ${response.data?.uptime || 'N/A'}`);
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} - ERRO: ${error.message}`);
    }
    
    await sleep(500);
  }
}

// Função para testar funcionalidades específicas
async function testSpecificFeatures(superAdminAuth, adminAuth) {
  console.log('\n🎯 TESTANDO FUNCIONALIDADES ESPECÍFICAS:');
  console.log('=======================================');
  
  // Teste de criação de domínio (ADMIN)
  if (adminAuth) {
    console.log('\n📝 Testando criação de domínio...');
    const testDomain = {
      domain: `test-${Date.now()}.example.com`,
      target_url: 'https://example.com',
      plan_id: 1
    };
    
    const createResult = await testEndpoint(
      `${config.domains.backend}/api/admin/domains`,
      adminAuth.token,
      'POST',
      testDomain,
      201
    );
    
    if (createResult.success && createResult.response.data?.id) {
      const domainId = createResult.response.data.id;
      console.log(`   ✅ Domínio criado com ID: ${domainId}`);
      
      // Testar busca do domínio criado
      await testEndpoint(
        `${config.domains.backend}/api/admin/domains/${domainId}`,
        adminAuth.token,
        'GET'
      );
      
      // Testar exclusão do domínio
      await testEndpoint(
        `${config.domains.backend}/api/admin/domains/${domainId}`,
        adminAuth.token,
        'DELETE'
      );
    }
  }
  
  // Teste de analytics (SUPERADMIN)
  if (superAdminAuth) {
    console.log('\n📊 Testando analytics...');
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    await testEndpoint(
      `${config.domains.backend}/api/superadmin/analytics?start_date=${startDate}&end_date=${endDate}`,
      superAdminAuth.token,
      'GET'
    );
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando testes abrangentes do sistema...\n');
  
  // Testar domínios de produção
  await testProductionDomains();
  
  // Fazer login como SUPERADMIN
  const superAdminAuth = await login(config.credentials.superadmin, 'SUPERADMIN');
  
  // Fazer login como ADMIN
  const adminAuth = await login(config.credentials.admin, 'ADMIN');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Testar APIs do SUPERADMIN
  if (superAdminAuth) {
    const superAdminResults = await testSuperAdminAPIs(superAdminAuth);
    totalPassed += superAdminResults.passed;
    totalFailed += superAdminResults.failed;
  } else {
    console.log('\n❌ Não foi possível testar APIs do SUPERADMIN (falha no login)');
  }
  
  // Testar APIs do ADMIN
  if (adminAuth) {
    const adminResults = await testAdminAPIs(adminAuth);
    totalPassed += adminResults.passed;
    totalFailed += adminResults.failed;
  } else {
    console.log('\n❌ Não foi possível testar APIs do ADMIN (falha no login)');
  }
  
  // Testar funcionalidades específicas
  await testSpecificFeatures(superAdminAuth, adminAuth);
  
  // Relatório final
  console.log('\n📊 RELATÓRIO FINAL DOS TESTES:');
  console.log('=============================');
  console.log(`✅ Testes aprovados: ${totalPassed}`);
  console.log(`❌ Testes falharam: ${totalFailed}`);
  console.log(`📈 Taxa de sucesso: ${totalPassed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema está funcionando corretamente.');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os logs acima para detalhes.');
  }
  
  console.log('\n✅ Testes concluídos!');
}

// Executar testes
main().catch(error => {
  console.error('❌ Erro durante os testes:', error);
  process.exit(1);
});