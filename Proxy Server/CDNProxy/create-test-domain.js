const jwt = require('jsonwebtoken');

// Token JWT do usuário SUPERADMIN
const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik1GYjlnYWVOT3krZVpWaWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2p5Y29ueGFsY2ZxdnFha3Jzd25iLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzZWZmYzc1OC1mZjY2LTRmYTMtYmZjOC1mOWM4M2JjZWNiMmIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNzY2MjUyLCJpYXQiOjE3NjE3NjI2NTIsImVtYWlsIjoiYWxheHJpY2FyZHNpbHZhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBbGF4IFJpY2FyZCIsInJvbGUiOiJTVVBFUkFETUlOIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjE3NjIzNTN9XSwic2Vzc2lvbl9pZCI6ImFiM2ZhZDhlLTdjOWMtNDg5YS04NjljLTFmYzAxNGIzOGM3MyIsImlzX2Fub255bW91cyI6ZmFsc2V9.TcNqBkn_A6XIxNJ-ful_w1vgHGcYBU0krTR3wTKebaI';

async function testWithExistingDomains() {
  console.log('🔍 Buscando domínios existentes no Supabase...\n');

  try {
    // Primeiro, vamos buscar domínios existentes
    const response = await fetch('http://localhost:5001/api/superadmin/domains?limit=10', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-supabase-token': token
      }
    });

    console.log('📥 Resposta GET domains:');
    console.log('- Status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta recebida com sucesso!');
      
      if (data.data && data.data.length > 0) {
        console.log(`📋 Encontrados ${data.data.length} domínios:`);
        
        data.data.forEach((domain, index) => {
          console.log(`${index + 1}. ID: ${domain.id}`);
          console.log(`   Domínio: ${domain.domain}`);
          console.log(`   Status: ${domain.status}`);
          console.log(`   User ID: ${domain.user_id}`);
          console.log('');
        });
        
        // Testar PUT com o primeiro domínio
        const firstDomain = data.data[0];
        console.log('🧪 Testando PUT com domínio existente...');
        await testPutWithDomain(firstDomain);
        
      } else {
        console.log('ℹ️ Nenhum domínio encontrado na resposta.');
        console.log('📄 Dados completos:', JSON.stringify(data, null, 2));
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Erro ao buscar domínios:', errorText);
    }

  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

async function testPutWithDomain(domain) {
  console.log(`\n📤 Testando PUT com domínio: ${domain.domain} (ID: ${domain.id})`);
  
  // Vamos testar diferentes cenários que podem causar erro 500
  const testCases = [
    {
      name: 'Atualizar apenas status',
      data: {
        id: domain.id,
        status: domain.status === 'active' ? 'inactive' : 'active'
      }
    },
    {
      name: 'Atualizar SSL enabled',
      data: {
        id: domain.id,
        ssl_enabled: true
      }
    },
    {
      name: 'Atualizar analytics enabled',
      data: {
        id: domain.id,
        analytics_enabled: true
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Teste: ${testCase.name}`);
    console.log('📤 Dados:', JSON.stringify(testCase.data, null, 2));

    try {
      const response = await fetch('http://localhost:5001/api/superadmin/domains', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-supabase-token': token
        },
        body: JSON.stringify(testCase.data)
      });

      console.log('📥 Resposta:', response.status, response.statusText);
      
      const responseText = await response.text();
      
      if (response.status === 500) {
        console.log('🔍 ERRO 500 ENCONTRADO!');
        console.log('📄 Detalhes do erro:', responseText);
        
        // Parar no primeiro erro 500 para análise
        break;
      } else if (response.ok) {
        console.log('✅ Sucesso!');
        
        // Reverter a alteração
        console.log('🔄 Revertendo alteração...');
        const revertData = {
          id: domain.id,
          status: domain.status // Voltar ao status original
        };
        
        await fetch('http://localhost:5001/api/superadmin/domains', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-supabase-token': token
          },
          body: JSON.stringify(revertData)
        });
        
      } else {
        console.log('❌ Erro:', responseText);
      }

    } catch (error) {
      console.error('💥 Erro na requisição:', error.message);
    }
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Executar teste
testWithExistingDomains().catch(console.error);