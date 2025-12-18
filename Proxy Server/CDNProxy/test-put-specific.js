const jwt = require('jsonwebtoken');

// Token JWT do usuário SUPERADMIN
const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik1GYjlnYWVOT3krZVpWaWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2p5Y29ueGFsY2ZxdnFha3Jzd25iLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzZWZmYzc1OC1mZjY2LTRmYTMtYmZjOC1mOWM4M2JjZWNiMmIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNzY2MjUyLCJpYXQiOjE3NjE3NjI2NTIsImVtYWlsIjoiYWxheHJpY2FyZHNpbHZhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBbGF4IFJpY2FyZCIsInJvbGUiOiJTVVBFUkFETUlOIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjE3NjIzNTN9XSwic2Vzc2lvbl9pZCI6ImFiM2ZhZDhlLTdjOWMtNDg5YS04NjljLTFmYzAxNGIzOGM3MyIsImlzX2Fub255bW91cyI6ZmFsc2V9.TcNqBkn_A6XIxNJ-ful_w1vgHGcYBU0krTR3wTKebaI';

async function testSpecificPutScenarios() {
  console.log('🧪 Testando cenários específicos que podem causar erro 500...\n');

  // ID de um domínio real que vimos no log anterior
  const realDomainId = '4b5b8e5a-7c8d-4e9f-a1b2-3c4d5e6f7890'; // Vamos usar um ID real

  // Primeiro, vamos buscar um domínio real
  console.log('🔍 Buscando domínio real...');
  
  try {
    const getResponse = await fetch('http://localhost:5001/api/superadmin/domains?limit=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-supabase-token': token
      }
    });

    if (getResponse.ok) {
      const getData = await getResponse.json();
      if (getData.data && getData.data.length > 0) {
        const domain = getData.data[0];
        console.log('✅ Domínio encontrado:', domain.domain, 'ID:', domain.id);
        
        // Agora vamos testar cenários específicos que podem causar erro 500
        await testPutScenarios(domain);
      } else {
        console.log('❌ Nenhum domínio encontrado');
      }
    } else {
      console.log('❌ Erro ao buscar domínios:', getResponse.status);
    }

  } catch (error) {
    console.error('💥 Erro:', error.message);
  }
}

async function testPutScenarios(domain) {
  console.log(`\n🧪 Testando PUT com domínio: ${domain.domain}`);
  
  // Cenários que podem causar erro 500
  const scenarios = [
    {
      name: 'Cenário 1: Atualizar com user_id inválido (pode causar erro no join users!inner)',
      data: {
        id: domain.id,
        user_id: '00000000-0000-0000-0000-000000000000' // UUID que não existe
      }
    },
    {
      name: 'Cenário 2: Atualizar com plan_id inválido',
      data: {
        id: domain.id,
        plan_id: '00000000-0000-0000-0000-000000000000' // UUID que não existe
      }
    },
    {
      name: 'Cenário 3: Atualizar domínio para um que já existe',
      data: {
        id: domain.id,
        domain: 'gf.proxysrv.top' // Domínio que pode já existir
      }
    },
    {
      name: 'Cenário 4: Atualizar com target_url inválida',
      data: {
        id: domain.id,
        target_url: 'invalid-url-format'
      }
    },
    {
      name: 'Cenário 5: Atualizar apenas status (deve funcionar)',
      data: {
        id: domain.id,
        status: domain.status === 'active' ? 'inactive' : 'active'
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📋 ${scenario.name}`);
    console.log('📤 Dados:', JSON.stringify(scenario.data, null, 2));

    try {
      const response = await fetch('http://localhost:5001/api/superadmin/domains', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-supabase-token': token
        },
        body: JSON.stringify(scenario.data)
      });

      console.log('📥 Status:', response.status, response.statusText);
      
      const responseText = await response.text();
      
      if (response.status === 500) {
        console.log('🔍 ERRO 500 REPRODUZIDO!');
        console.log('📄 Detalhes:', responseText);
        
        // Vamos verificar os logs do backend imediatamente
        console.log('\n📋 Verificando logs do backend...');
        return; // Parar no primeiro erro 500
        
      } else if (response.status >= 400) {
        console.log('⚠️ Erro esperado:', responseText);
      } else {
        console.log('✅ Sucesso:', responseText.substring(0, 100) + '...');
        
        // Se foi o teste de status, reverter
        if (scenario.name.includes('status')) {
          console.log('🔄 Revertendo status...');
          await fetch('http://localhost:5001/api/superadmin/domains', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-supabase-token': token
            },
            body: JSON.stringify({
              id: domain.id,
              status: domain.status // Voltar ao original
            })
          });
        }
      }

    } catch (error) {
      console.error('💥 Erro na requisição:', error.message);
    }
    
    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Executar teste
testSpecificPutScenarios().catch(console.error);