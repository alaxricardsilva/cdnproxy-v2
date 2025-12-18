const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estrutura atual da tabela access_logs...');
    
    // Verificar estrutura da tabela
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela:', error);
      return;
    }
    
    console.log('📋 Estrutura atual da tabela (baseada em um registro):');
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('Colunas encontradas:', columns);
      
      // Verificar dados de exemplo
      console.log('\n📊 Exemplo de dados atuais:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️ Tabela vazia, não é possível verificar estrutura pelos dados');
    }
    
    // Verificar alguns registros para entender os campos nulos
    console.log('\n🔍 Verificando registros com campos nulos...');
    const { data: nullData, error: nullError } = await supabase
      .from('access_logs')
      .select('*')
      .limit(5);
    
    if (!nullError && nullData) {
      console.log('\n📊 Primeiros 5 registros da tabela:');
      nullData.forEach((record, index) => {
        console.log(`\n--- Registro ${index + 1} ---`);
        console.log(`ID: ${record.id}`);
        console.log(`Domain: ${record.domain}`);
        console.log(`Domain ID: ${record.domain_id}`);
        console.log(`Path: ${record.path}`);
        console.log(`Method: ${record.method}`);
        console.log(`Status: ${record.status}`);
        console.log(`Status Code: ${record.status_code}`);
        console.log(`Client IP: ${record.client_ip}`);
        console.log(`User Agent: ${record.user_agent}`);
        console.log(`Device Type: ${record.device_type}`);
        console.log(`Country: ${record.country}`);
        console.log(`City: ${record.city}`);
        console.log(`Response Time: ${record.response_time}`);
        console.log(`Cache Status: ${record.cache_status}`);
        console.log(`Bytes Sent: ${record.bytes_sent}`);
        console.log(`Referer: ${record.referer}`);
        console.log(`Created At: ${record.created_at}`);
        console.log(`Access Timestamp: ${record.access_timestamp}`);
      });
    }
    
    // Testar inserção de um registro com país em português
    console.log('\n🧪 Testando inserção de registro com país em português...');
    const testRecord = {
      domain: 'test.example.com',
      domain_id: 1,
      path: '/test',
      method: 'GET',
      status_code: 200,
      client_ip: '192.168.1.1',
      user_agent: 'Test Agent',
      device_type: 'desktop',
      country: 'Brasil',
      city: 'São Paulo',
      response_time: 150,
      cache_status: 'HIT',
      bytes_sent: 1024,
      referer: 'https://google.com'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('access_logs')
      .insert([testRecord])
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir registro de teste:', insertError);
      
      // Se der erro de tamanho do campo country, significa que ainda está VARCHAR(2)
      if (insertError.message.includes('value too long for type character varying(2)')) {
        console.log('⚠️ Campo country ainda está limitado a VARCHAR(2)');
        console.log('📝 É necessário alterar manualmente no painel do Supabase:');
        console.log('   ALTER TABLE access_logs ALTER COLUMN country TYPE VARCHAR(100);');
      }
    } else {
      console.log('✅ Registro de teste inserido com sucesso!');
      console.log('✅ Campo country aceita nomes completos em português');
      
      // Remover o registro de teste
      if (insertData && insertData[0]) {
        await supabase
          .from('access_logs')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🗑️ Registro de teste removido');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkTableStructure();