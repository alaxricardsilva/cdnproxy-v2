const jwt = require('jsonwebtoken');

// Token JWT do usuário SUPERADMIN
const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik1GYjlnYWVOT3krZVpWaWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2p5Y29ueGFsY2ZxdnFha3Jzd25iLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzZWZmYzc1OC1mZjY2LTRmYTMtYmZjOC1mOWM4M2JjZWNiMmIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNzY2MjUyLCJpYXQiOjE3NjE3NjI2NTIsImVtYWlsIjoiYWxheHJpY2FyZHNpbHZhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBbGF4IFJpY2FyZCIsInJvbGUiOiJTVVBFUkFETUlOIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjE3NjIzNTN9XSwic2Vzc2lvbl9pZCI6ImFiM2ZhZDhlLTdjOWMtNDg5YS04NjljLTFmYzAxNGIzOGM3MyIsImlzX2Fub255bW91cyI6ZmFsc2V9.TcNqBkn_A6XIxNJ-ful_w1vgHGcYBU0krTR3wTKebaI';

async function testDomainsPut() {
  console.log('🧪 Testando endpoint /api/superadmin/domains PUT...\n');

  // Primeiro, vamos decodificar o token para verificar se está válido
  try {
    const decoded = jwt.decode(token);
    console.log('📋 Token decodificado:');
    console.log('- Email:', decoded.email);
    console.log('- Role:', decoded.user_metadata?.role);
    console.log('- Expira em:', new Date(decoded.exp * 1000).toLocaleString());
    console.log('- Válido até:', decoded.exp > Date.now() / 1000 ? 'SIM' : 'NÃO');
    console.log('');
  } catch (error) {
    console.error('❌ Erro ao decodificar token:', error.message);
    return;
  }

  // Dados de teste para atualizar um domínio
  const testData = {
    id: 'test-domain-id', // ID fictício para teste
    domain: 'test.example.com',
    target_url: 'https://example.com',
    status: 'active',
    ssl_enabled: true
  };

  console.log('📤 Enviando requisição PUT para /api/superadmin/domains');
  console.log('📋 Dados:', JSON.stringify(testData, null, 2));
  console.log('');

  try {
    const response = await fetch('http://localhost:5001/api/superadmin/domains', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-supabase-token': token
      },
      body: JSON.stringify(testData)
    });

    console.log('📥 Resposta recebida:');
    console.log('- Status:', response.status, response.statusText);
    console.log('- Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('- Body:', responseText);

    if (response.ok) {
      console.log('✅ Teste bem-sucedido!');
    } else {
      console.log('❌ Teste falhou com status:', response.status);
    }

  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

// Executar teste
testDomainsPut().catch(console.error);