const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testEpisodeEndpointDetailed() {
    console.log('🔍 Teste detalhado do endpoint de episódios...\n');
    
    const testData = {
        domain: 'teste.cdnproxy.top',
        domain_id: '944c0d91-125d-453d-992c-05a9104affaa',
        episode_id: 'test-episode-001',
        session_id: 'test-session-123',
        change_type: 'new_episode',
        content_id: 'content-123',
        client_ip: '127.0.0.1',
        device_type: 'browser',
        country: 'BR',
        user_agent: 'Mozilla/5.0 Test Browser',
        bytes_transferred: 1024000,
        duration_seconds: 300,
        quality: '1080p',
        bitrate: 5000,
        resolution: '1920x1080',
        fps: 30,
        buffer_health: 95,
        latency: 50,
        packet_loss: 0.1
    };
    
    console.log('📤 Dados sendo enviados:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('\n');
    
    try {
        const response = await axios.post(
            `${BASE_URL}/api/analytics/collect-episode-metrics`,
            testData,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('✅ Sucesso!');
        console.log('📄 Status:', response.status);
        console.log('📄 Resposta:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Erro detalhado:');
        console.log('📄 Status:', error.response?.status);
        console.log('📄 Status Text:', error.response?.statusText);
        console.log('📄 Headers:', error.response?.headers);
        console.log('📄 Dados do erro:', JSON.stringify(error.response?.data, null, 2));
        
        if (error.code) {
            console.log('📄 Código do erro:', error.code);
        }
        
        if (error.message) {
            console.log('📄 Mensagem:', error.message);
        }
    }
}

// Executar teste
testEpisodeEndpointDetailed();