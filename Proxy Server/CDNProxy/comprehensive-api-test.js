#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

// Configurações
const BASE_URL = 'https://api.cdnproxy.top';
const FRONTEND_URL = 'https://app.cdnproxy.top';

// Credenciais
const SUPERADMIN_CREDENTIALS = {
  email: 'alaxricardsilva@gmail.com',
  password: 'Admin123'
};

const ADMIN_CREDENTIALS = {
  email: 'alaxricardsilva@outlook.com',
  password: 'Admin123'
};

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
      timeout: 30000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            raw: true
          });
        }
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

// Função para fazer login
async function login(credentials, userType) {
  console.log(`\n🔐 Fazendo login como ${userType}...`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: credentials
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log(`   ✅ Login bem-sucedido para ${userType}`);
      console.log(`   Token: ${response.data.session?.access_token ? 'Presente' : 'Ausente'}`);
      return {
        success: true,
        token: response.data.session?.access_token,
        user: response.data.user
      };
    } else {
      console.log(`   ❌ Falha no login para ${userType}`);
      console.log(`   Resposta:`, JSON.stringify(response.data, null, 2));
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Erro no login para ${userType}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Função para testar endpoint
async function testEndpoint(url, token, method = 'GET', body = null, description = '') {
  try {
    const options = {
      method,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };
    
    if (body) {
      options.body = body;
    }

    const response = await makeRequest(url, options);
    
    const status = response.status >= 200 && response.status < 300 ? '✅' : '❌';
    console.log(`   ${status} ${method} ${url.replace(BASE_URL, '')} - ${response.status} ${description}`);
    
    if (response.status >= 400) {
      console.log(`      Erro: ${JSON.stringify(response.data, null, 2)}`);
    }
    
    return response;
  } catch (error) {
    console.log(`   ❌ ${method} ${url.replace(BASE_URL, '')} - Erro: ${error.message}`);
    return { status: 0, error: error.message };
  }
}

// Função para testar APIs do SUPERADMIN
async function testSuperAdminAPIs(token) {
  console.log('\n🔧 TESTANDO APIs do SUPERADMIN');
  console.log('='.repeat(50));

  const endpoints = [
    { url: '/api/auth/me', method: 'GET', desc: 'Perfil do usuário' },
    { url: '/api/superadmin/dashboard', method: 'GET', desc: 'Dashboard SUPERADMIN' },
    { url: '/api/superadmin/users', method: 'GET', desc: 'Lista de usuários' },
    { url: '/api/superadmin/domains', method: 'GET', desc: 'Lista de domínios' },
    { url: '/api/superadmin/analytics', method: 'GET', desc: 'Analytics gerais' },
    { url: '/api/superadmin/system-health', method: 'GET', desc: 'Saúde do sistema' },
    { url: '/api/superadmin/payments', method: 'GET', desc: 'Pagamentos' },
    { url: '/api/superadmin/notifications', method: 'GET', desc: 'Notificações' },
    { url: '/api/analytics/overview', method: 'GET', desc: 'Visão geral analytics' },
    { url: '/api/analytics/traffic', method: 'GET', desc: 'Tráfego' },
    { url: '/api/analytics/performance', method: 'GET', desc: 'Performance' },
    { url: '/api/domains', method: 'GET', desc: 'Domínios do usuário' },
    { url: '/api/payments/history', method: 'GET', desc: 'Histórico de pagamentos' }
  ];

  let successCount = 0;
  let totalCount = endpoints.length;

  for (const endpoint of endpoints) {
    const response = await testEndpoint(
      `${BASE_URL}${endpoint.url}`, 
      token, 
      endpoint.method, 
      null, 
      endpoint.desc
    );
    
    if (response.status >= 200 && response.status < 300) {
      successCount++;
    }
    
    await sleep(500); // Aguardar entre requisições
  }

  console.log(`\n📊 SUPERADMIN APIs: ${successCount}/${totalCount} endpoints funcionando`);
  return { success: successCount, total: totalCount };
}

// Função para testar APIs do ADMIN
async function testAdminAPIs(token) {
  console.log('\n👤 TESTANDO APIs do ADMIN');
  console.log('='.repeat(50));

  const endpoints = [
    { url: '/api/auth/me', method: 'GET', desc: 'Perfil do usuário' },
    { url: '/api/admin/dashboard', method: 'GET', desc: 'Dashboard ADMIN' },
    { url: '/api/admin/domains', method: 'GET', desc: 'Domínios do admin' },
    { url: '/api/admin/analytics', method: 'GET', desc: 'Analytics do admin' },
    { url: '/api/admin/profile', method: 'GET', desc: 'Perfil do admin' },
    { url: '/api/admin/notifications', method: 'GET', desc: 'Notificações' },
    { url: '/api/admin/payments', method: 'GET', desc: 'Pagamentos do admin' },
    { url: '/api/domains', method: 'GET', desc: 'Domínios do usuário' },
    { url: '/api/payments/history', method: 'GET', desc: 'Histórico de pagamentos' },
    { url: '/api/analytics/overview', method: 'GET', desc: 'Visão geral analytics' }
  ];

  let successCount = 0;
  let totalCount = endpoints.length;

  for (const endpoint of endpoints) {
    const response = await testEndpoint(
      `${BASE_URL}${endpoint.url}`, 
      token, 
      endpoint.method, 
      null, 
      endpoint.desc
    );
    
    if (response.status >= 200 && response.status < 300) {
      successCount++;
    }
    
    await sleep(500); // Aguardar entre requisições
  }

  console.log(`\n📊 ADMIN APIs: ${successCount}/${totalCount} endpoints funcionando`);
  return { success: successCount, total: totalCount };
}

// Função para testar endpoints públicos
async function testPublicEndpoints() {
  console.log('\n🌐 TESTANDO Endpoints Públicos');
  console.log('='.repeat(50));

  const endpoints = [
    { url: '/api/health', method: 'GET', desc: 'Health check' },
    { url: '/api/metrics', method: 'GET', desc: 'Métricas públicas' }
  ];

  let successCount = 0;
  let totalCount = endpoints.length;

  for (const endpoint of endpoints) {
    const response = await testEndpoint(
      `${BASE_URL}${endpoint.url}`, 
      null, 
      endpoint.method, 
      null, 
      endpoint.desc
    );
    
    if (response.status >= 200 && response.status < 300) {
      successCount++;
    }
    
    await sleep(500);
  }

  console.log(`\n📊 Endpoints Públicos: ${successCount}/${totalCount} funcionando`);
  return { success: successCount, total: totalCount };
}

// Função para testar conectividade com domínios
async function testDomainConnectivity() {
  console.log('\n🔗 TESTANDO Conectividade dos Domínios');
  console.log('='.repeat(50));

  const domains = [
    { url: FRONTEND_URL, name: 'Frontend (app.cdnproxy.top)' },
    { url: BASE_URL, name: 'Backend (api.cdnproxy.top)' }
  ];

  let successCount = 0;
  let totalCount = domains.length;

  for (const domain of domains) {
    try {
      const response = await makeRequest(`${domain.url}/api/health`);
      const status = response.status >= 200 && response.status < 300 ? '✅' : '❌';
      console.log(`   ${status} ${domain.name} - Status: ${response.status}`);
      
      if (response.status >= 200 && response.status < 300) {
        successCount++;
      }
    } catch (error) {
      console.log(`   ❌ ${domain.name} - Erro: ${error.message}`);
    }
    
    await sleep(1000);
  }

  console.log(`\n📊 Conectividade: ${successCount}/${totalCount} domínios acessíveis`);
  return { success: successCount, total: totalCount };
}

// Função principal
async function main() {
  console.log('🚀 INICIANDO TESTES ABRANGENTES DAS APIs');
  console.log('='.repeat(60));
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BASE_URL}`);
  console.log('='.repeat(60));

  const results = {
    connectivity: { success: 0, total: 0 },
    publicEndpoints: { success: 0, total: 0 },
    superadminLogin: false,
    superadminAPIs: { success: 0, total: 0 },
    adminLogin: false,
    adminAPIs: { success: 0, total: 0 }
  };

  try {
    // 1. Testar conectividade dos domínios
    results.connectivity = await testDomainConnectivity();
    
    // 2. Testar endpoints públicos
    results.publicEndpoints = await testPublicEndpoints();
    
    // 3. Testar login e APIs do SUPERADMIN
    const superadminAuth = await login(SUPERADMIN_CREDENTIALS, 'SUPERADMIN');
    results.superadminLogin = superadminAuth.success;
    
    if (superadminAuth.success && superadminAuth.token) {
      await sleep(2000); // Aguardar antes de testar APIs
      results.superadminAPIs = await testSuperAdminAPIs(superadminAuth.token);
    }
    
    // 4. Aguardar antes do próximo teste
    await sleep(3000);
    
    // 5. Testar login e APIs do ADMIN
    const adminAuth = await login(ADMIN_CREDENTIALS, 'ADMIN');
    results.adminLogin = adminAuth.success;
    
    if (adminAuth.success && adminAuth.token) {
      await sleep(2000); // Aguardar antes de testar APIs
      results.adminAPIs = await testAdminAPIs(adminAuth.token);
    }

  } catch (error) {
    console.log(`\n❌ Erro durante os testes: ${error.message}`);
  }

  // Relatório final
  console.log('\n📋 RELATÓRIO FINAL DOS TESTES');
  console.log('='.repeat(60));
  
  console.log(`🔗 Conectividade: ${results.connectivity.success}/${results.connectivity.total}`);
  console.log(`🌐 Endpoints Públicos: ${results.publicEndpoints.success}/${results.publicEndpoints.total}`);
  console.log(`🔐 Login SUPERADMIN: ${results.superadminLogin ? '✅' : '❌'}`);
  console.log(`🔧 APIs SUPERADMIN: ${results.superadminAPIs.success}/${results.superadminAPIs.total}`);
  console.log(`🔐 Login ADMIN: ${results.adminLogin ? '✅' : '❌'}`);
  console.log(`👤 APIs ADMIN: ${results.adminAPIs.success}/${results.adminAPIs.total}`);
  
  const totalSuccess = results.connectivity.success + results.publicEndpoints.success + 
                      results.superadminAPIs.success + results.adminAPIs.success +
                      (results.superadminLogin ? 1 : 0) + (results.adminLogin ? 1 : 0);
  
  const totalTests = results.connectivity.total + results.publicEndpoints.total + 
                     results.superadminAPIs.total + results.adminAPIs.total + 2;
  
  console.log(`\n🎯 RESULTADO GERAL: ${totalSuccess}/${totalTests} testes passaram`);
  console.log(`📊 Taxa de Sucesso: ${((totalSuccess / totalTests) * 100).toFixed(2)}%`);
  
  // Salvar relatório
  const reportData = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalSuccess,
      totalTests,
      successRate: ((totalSuccess / totalTests) * 100).toFixed(2)
    }
  };
  
  fs.writeFileSync('api-test-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Relatório salvo em: api-test-report.json');
  
  if (totalSuccess === totalTests) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    process.exit(0);
  } else {
    console.log('\n⚠️  ALGUNS TESTES FALHARAM - Verifique os logs acima');
    process.exit(1);
  }
}

// Executar testes
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});