const fetch = require('node-fetch');

// Token JWT fornecido pelo usuário
const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik1GYjlnYWVOT3krZVpWaWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2p5Y29ueGFsY2ZxdnFha3Jzd25iLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhMjA4NDhhYy05NGZjLTQ3MDMtOWE2MS1kOGYwMjg5NDQ0NzEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNzY1MzU4LCJpYXQiOjE3NjE3NjE3NTgsImVtYWlsIjoiYWxheHJpY2FyZHNpbHZhQG91dGxvb2suY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkFsYXggUmljYXJkIiwicm9sZSI6IkFETUlOIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjE3NjE3NTh9XSwic2Vzc2lvbl9pZCI6IjQ5NDUyZTliLTljZWYtNDQ1MS05ZTkwLWNlNGU1MjU4NjY0YSIsImlzX2Fub255bW91cyI6ZmFsc2V9.a57z-5QIhGy1iPgdh7wx2g0uY7-ePWmxZi2VIT6LXps';

async function testAuthExchange() {
  console.log('🔍 Testando endpoint /api/auth/exchange...\n');

  try {
    // Teste 1: Requisição POST (método correto)
    console.log('📋 Teste 1: POST com Authorization header');
    const response1 = await fetch('http://localhost:5001/api/auth/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://app.cdnproxy.top'
      },
      body: JSON.stringify({})
    });

    console.log('Status:', response1.status);
    console.log('Headers:', Object.fromEntries(response1.headers.entries()));
    
    const text1 = await response1.text();
    console.log('Response:', text1);
    console.log('---\n');

    // Teste 2: Requisição POST com x-supabase-token header
    console.log('📋 Teste 2: POST com x-supabase-token header');
    const response2 = await fetch('http://localhost:5001/api/auth/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-supabase-token': token,
        'Origin': 'https://app.cdnproxy.top'
      },
      body: JSON.stringify({})
    });

    console.log('Status:', response2.status);
    console.log('Headers:', Object.fromEntries(response2.headers.entries()));
    
    const text2 = await response2.text();
    console.log('Response:', text2);
    console.log('---\n');

    // Teste 3: Verificar se o token está válido decodificando-o
    console.log('📋 Teste 3: Decodificando token JWT');
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('Token payload:', JSON.stringify(payload, null, 2));
      
      const now = Math.floor(Date.now() / 1000);
      console.log('Token exp:', payload.exp);
      console.log('Current time:', now);
      console.log('Token expired:', payload.exp < now);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAuthExchange();