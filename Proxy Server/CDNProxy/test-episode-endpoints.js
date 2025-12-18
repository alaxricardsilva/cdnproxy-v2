const axios = require('axios');

// Configuração
const BASE_URL = 'http://localhost:5001'; // URL local do backend
const ENDPOINTS = {
  episodeMetrics: '/api/analytics/collect-episode-metrics',
  sessionChange: '/api/analytics/collect-session-change'
};

// Dados de teste
const testEpisodeData = {
  domain: 'gf.proxysrv.top',
  domain_id: '4b684d2d-f8ea-47da-a107-e3a3ba289e22', // ID válido do domínio teste.cdnproxy.top
  episode_id: 'test-episode-001',
  session_id: 'test-session-123',
  change_type: 'new_episode',
  content_id: 'serie-teste',
  client_ip: '127.0.0.1',
  device_type: 'desktop',
  country: 'BR',
  user_agent: 'Mozilla/5.0 Test Browser',
  bytes_transferred: 1024000,
  duration_seconds: 300,
  quality: '1080p',
  bandwidth_mbps: 5.2
};

const testSessionData = {
  session_id: 'test-session-456',
  client_ip: '127.0.0.1',
  previous_session_id: 'test-session-123',
  change_reason: 'new_episode',
  domain: 'gf.proxysrv.top',
  domain_id: '4b684d2d-f8ea-47da-a107-e3a3ba289e22', // ID válido do domínio teste.cdnproxy.top
  episode_id: 'test-episode-002',
  user_agent: 'Mozilla/5.0 Test Browser',
  device_type: 'desktop',
  country: 'BR',
  bytes_sent: 512000,
  response_time_ms: 150
};

async function testEndpoint(endpoint, data, name) {
  try {
    console.log(`\n🧪 Testando ${name}...`);
    console.log(`📡 URL: ${BASE_URL}${endpoint}`);
    
    const response = await axios.post(`${BASE_URL}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ ${name} - Status: ${response.status}`);
    console.log(`📄 Resposta:`, JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.log(`❌ ${name} - Erro:`, error.message);
    
    if (error.response) {
      console.log(`📄 Status: ${error.response.status}`);
      console.log(`📄 Dados:`, error.response.data);
    }
    
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes dos endpoints de episódios...');
  console.log(`🔗 Base URL: ${BASE_URL}`);
  
  let successCount = 0;
  let totalTests = 2;
  
  // Teste 1: Episode Metrics
  const test1 = await testEndpoint(
    ENDPOINTS.episodeMetrics, 
    testEpisodeData, 
    'Episode Metrics'
  );
  if (test1) successCount++;
  
  // Aguardar um pouco entre os testes
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 2: Session Change
  const test2 = await testEndpoint(
    ENDPOINTS.sessionChange, 
    testSessionData, 
    'Session Change'
  );
  if (test2) successCount++;
  
  // Resultado final
  console.log('\n📊 RESULTADO DOS TESTES:');
  console.log(`✅ Sucessos: ${successCount}/${totalTests}`);
  console.log(`❌ Falhas: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('🎉 Todos os testes passaram! Os endpoints estão funcionando corretamente.');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique os logs acima.');
  }
}

// Executar testes
runTests().catch(error => {
  console.error('💥 Erro fatal nos testes:', error.message);
  process.exit(1);
});