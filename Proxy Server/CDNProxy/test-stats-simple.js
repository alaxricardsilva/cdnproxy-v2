const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

async function testStatsEndpoint() {
  console.log('🔍 Testando endpoint stats com debug...\n');

  try {
    // 1. Fazer login
    console.log('📋 1. Fazendo login...');
    const loginResponse = await axios.post('https://api.cdnproxy.top/api/auth/login', {
      email: 'alaxricardsilva@gmail.com',
      password: 'Admin123'
    });

    const token = loginResponse.data.session.access_token;
    console.log('✅ Token obtido:', token.substring(0, 50) + '...');

    // 2. Testar cada consulta individualmente
    const supabase = createClient(
      'https://jyconxalcfqvqakrswnb.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY'
    );

    console.log('\n📋 2. Testando consultas individuais...');

    // Teste users
    try {
      const { data: users, error: usersError, count: usersCount } = await supabase
        .from('users')
        .select('id, role, created_at', { count: 'exact' });
      
      if (usersError) {
        console.log('❌ Erro users:', usersError.message);
      } else {
        console.log('✅ Users:', usersCount, 'registros');
      }
    } catch (e) {
      console.log('❌ Exceção users:', e.message);
    }

    // Teste domains
    try {
      const { data: domains, error: domainsError, count: domainsCount } = await supabase
        .from('domains')
        .select('id, active, created_at', { count: 'exact' });
      
      if (domainsError) {
        console.log('❌ Erro domains:', domainsError.message);
      } else {
        console.log('✅ Domains:', domainsCount, 'registros');
      }
    } catch (e) {
      console.log('❌ Exceção domains:', e.message);
    }

    // Teste transactions
    try {
      const { data: transactions, error: transactionsError, count: transactionsCount } = await supabase
        .from('transactions')
        .select('id, status, amount, created_at', { count: 'exact' });
      
      if (transactionsError) {
        console.log('❌ Erro transactions:', transactionsError.message);
      } else {
        console.log('✅ Transactions:', transactionsCount, 'registros');
      }
    } catch (e) {
      console.log('❌ Exceção transactions:', e.message);
    }

    // Teste plans
    try {
      const { data: plans, error: plansError, count: plansCount } = await supabase
        .from('plans')
        .select('id, active', { count: 'exact' });
      
      if (plansError) {
        console.log('❌ Erro plans:', plansError.message);
      } else {
        console.log('✅ Plans:', plansCount, 'registros');
      }
    } catch (e) {
      console.log('❌ Exceção plans:', e.message);
    }

    // 3. Testar o endpoint real
    console.log('\n📋 3. Testando endpoint real...');
    try {
      const response = await axios.get('https://api.cdnproxy.top/api/superadmin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Endpoint funcionou!');
      console.log('📊 Dados:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Erro no endpoint:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testStatsEndpoint();