#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuração
const FRONTEND_URL = 'https://app.cdnproxy.top';
const BACKEND_URL = 'https://api.cdnproxy.top';

// Função para fazer requisições HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Debug-Script/1.0',
        ...options.headers
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: e.message
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

// Função para testar login e obter token
async function testLogin() {
  console.log('🔐 Testando login SUPERADMIN...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'alaxricardsilva@gmail.com',
        password: 'Admin123'
      }
    });
    
    console.log('📋 Status do login:', response.status);
    console.log('📋 Dados do login:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.token) {
      return response.data.token;
    } else {
      console.log('❌ Login falhou');
      return null;
    }
  } catch (error) {
    console.log('❌ Erro no login:', error.message);
    return null;
  }
}

// Função para testar API específica com detalhes
async function testSpecificAPI(endpoint, token = null) {
  console.log(`\n🔍 Testando endpoint: ${endpoint}`);
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await makeRequest(`${BACKEND_URL}${endpoint}`, {
      headers
    });
    
    console.log('📋 Status:', response.status);
    console.log('📋 Headers de resposta:', JSON.stringify(response.headers, null, 2));
    
    if (response.parseError) {
      console.log('⚠️ Erro ao parsear JSON:', response.parseError);
      console.log('📋 Dados brutos:', response.data);
    } else {
      console.log('📋 Dados:', JSON.stringify(response.data, null, 2));
    }
    
    return response;
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
    console.log('📋 Stack trace:', error.stack);
    return { error: error.message, stack: error.stack };
  }
}

// Função para verificar status dos serviços
async function checkServiceStatus() {
  console.log('\n🔧 Verificando status dos serviços...');
  
  // Testar backend diretamente
  try {
    const backendResponse = await makeRequest(`${BACKEND_URL}/api/system/health`);
    console.log('✅ Backend Health:', backendResponse.status, JSON.stringify(backendResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Backend Health Error:', error.message);
  }
  
  // Testar frontend
  try {
    const frontendResponse = await makeRequest(`${FRONTEND_URL}/`);
    console.log('✅ Frontend Status:', frontendResponse.status);
  } catch (error) {
    console.log('❌ Frontend Error:', error.message);
  }
}

// Função para investigar CDN null
async function investigateCDNStatus(token) {
  console.log('\n🔍 Investigando status CDN null...');
  
  try {
    // Testar endpoint de monitoramento
    const monitoringResponse = await testSpecificAPI('/api/system/monitoring', token);
    
    if (monitoringResponse.data && monitoringResponse.data.services) {
      console.log('📋 Serviços encontrados:', Object.keys(monitoringResponse.data.services));
      console.log('📋 Status CDN:', monitoringResponse.data.services.cdn);
    }
  } catch (error) {
    console.log('❌ Erro ao investigar CDN:', error.message);
  }
}

// Função para investigar contagem de servidores
async function investigateServerCount(token) {
  console.log('\n🔍 Investigando contagem de servidores...');
  
  try {
    // Testar endpoint de system-health
    const healthResponse = await testSpecificAPI('/api/superadmin/system-health', token);
    
    if (healthResponse.data && healthResponse.data.data) {
      console.log('📋 Servidores reportados:', healthResponse.data.data.servers);
      console.log('📋 Detalhes dos servidores:', JSON.stringify(healthResponse.data.data.details?.servers, null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao investigar servidores:', error.message);
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando debug detalhado das APIs...\n');
  
  // 1. Verificar status dos serviços
  await checkServiceStatus();
  
  // 2. Fazer login
  const token = await testLogin();
  
  if (!token) {
    console.log('❌ Não foi possível obter token, testando APIs sem autenticação...');
  }
  
  // 3. Testar APIs específicas com detalhes
  const apisToTest = [
    '/api/superadmin/system-health',
    '/api/superadmin/system-stats',
    '/api/system/health',
    '/api/system/monitoring'
  ];
  
  for (const api of apisToTest) {
    await testSpecificAPI(api, token);
  }
  
  // 4. Investigar problemas específicos
  if (token) {
    await investigateCDNStatus(token);
    await investigateServerCount(token);
  }
  
  console.log('\n✅ Debug concluído!');
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});