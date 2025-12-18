const jwt = require('jsonwebtoken');

// Token JWT do usuário SUPERADMIN
const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik1GYjlnYWVOT3krZVpWaWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2p5Y29ueGFsY2ZxdnFha3Jzd25iLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzZWZmYzc1OC1mZjY2LTRmYTMtYmZjOC1mOWM4M2JjZWNiMmIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxNzY2MjUyLCJpYXQiOjE3NjE3NjI2NTIsImVtYWlsIjoiYWxheHJpY2FyZHNpbHZhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBbGF4IFJpY2FyZCIsInJvbGUiOiJTVVBFUkFETUlOIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjE3NjIzNTN9XSwic2Vzc2lvbl9pZCI6ImFiM2ZhZDhlLTdjOWMtNDg5YS04NjljLTFmYzAxNGIzOGM3MyIsImlzX2Fub255bW91cyI6ZmFsc2V9.TcNqBkn_A6XIxNJ-ful_w1vgHGcYBU0krTR3wTKebaI';

async function checkDomains() {
  console.log('🔍 Verificando domínios existentes...\n');

  try {
    const response = await fetch('http://localhost:5001/api/superadmin/domains?limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-supabase-token': token
      }
    });

    console.log('📥 Resposta recebida:');
    console.log('- Status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Domínios encontrados:');
      
      if (data.data && data.data.length > 0) {
        data.data.forEach((domain, index) => {
          console.log(`${index + 1}. ID: ${domain.id}`);
          console.log(`   Domínio: ${domain.domain}`);
          console.log(`   Target URL: ${domain.target_url}`);
          console.log(`   Status: ${domain.status}`);
          console.log(`   User ID: ${domain.user_id}`);
          console.log('');
        });
        
        // Vamos testar com o primeiro domínio encontrado
        const firstDomain = data.data[0];
        console.log('🧪 Testando PUT com domínio real...');
        await testPutWithRealDomain(firstDomain);
      } else {
        console.log('ℹ️ Nenhum domínio encontrado no banco.');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Erro ao buscar domínios:', errorText);
    }

  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

async function testPutWithRealDomain(domain) {
  console.log(`\n📤 Testando PUT com domínio ID: ${domain.id}`);
  
  // Dados de teste - vamos apenas alterar o status
  const testData = {
    id: domain.id,
    status: domain.status === 'active' ? 'inactive' : 'active' // Alternar status
  };

  console.log('📋 Dados para atualização:', JSON.stringify(testData, null, 2));

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

    console.log('📥 Resposta PUT:');
    console.log('- Status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('- Body:', responseText);

    if (response.ok) {
      console.log('✅ PUT bem-sucedido!');
      
      // Reverter a alteração
      console.log('\n🔄 Revertendo alteração...');
      const revertData = {
        id: domain.id,
        status: domain.status // Voltar ao status original
      };
      
      const revertResponse = await fetch('http://localhost:5001/api/superadmin/domains', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-supabase-token': token
        },
        body: JSON.stringify(revertData)
      });
      
      if (revertResponse.ok) {
        console.log('✅ Status revertido com sucesso!');
      }
    } else {
      console.log('❌ PUT falhou com status:', response.status);
    }

  } catch (error) {
    console.error('💥 Erro na requisição PUT:', error.message);
  }
}

// Executar verificação
checkDomains().catch(console.error);