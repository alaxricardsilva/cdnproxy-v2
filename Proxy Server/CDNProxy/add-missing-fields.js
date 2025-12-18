const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingFields() {
  try {
    console.log('🔧 Adicionando campos faltantes na tabela access_logs...\n');
    
    // Verificar estrutura atual
    console.log('📋 Verificando estrutura atual...');
    const { data: currentData, error: currentError } = await supabase
      .from('access_logs')
      .select('*')
      .limit(1);
    
    if (currentError) {
      console.error('❌ Erro ao acessar tabela:', currentError);
      return;
    }
    
    const currentColumns = currentData && currentData.length > 0 ? Object.keys(currentData[0]) : [];
    console.log('✅ Colunas atuais:', currentColumns.sort());
    
    // Verificar se os campos city e referer existem
    const missingFields = [];
    if (!currentColumns.includes('city')) missingFields.push('city');
    if (!currentColumns.includes('referer')) missingFields.push('referer');
    
    if (missingFields.length === 0) {
      console.log('✅ Todos os campos necessários já existem!');
      return;
    }
    
    console.log('⚠️ Campos faltantes:', missingFields);
    
    // Como não podemos usar exec_sql, vamos tentar uma abordagem diferente
    // Vamos criar um registro temporário com os campos que queremos adicionar
    console.log('\n📝 Instruções para adicionar campos manualmente no Supabase:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/jyconxalcfqvqakrswnb');
    console.log('2. Vá para "Table Editor" > "access_logs"');
    console.log('3. Clique em "Add Column" e adicione:');
    
    if (missingFields.includes('city')) {
      console.log('   - Nome: city');
      console.log('   - Tipo: varchar');
      console.log('   - Tamanho: 100');
      console.log('   - Nullable: true');
    }
    
    if (missingFields.includes('referer')) {
      console.log('   - Nome: referer');
      console.log('   - Tipo: text');
      console.log('   - Nullable: true');
    }
    
    console.log('\n📝 Ou execute estes comandos SQL no SQL Editor:');
    if (missingFields.includes('city')) {
      console.log('ALTER TABLE access_logs ADD COLUMN city VARCHAR(100);');
    }
    if (missingFields.includes('referer')) {
      console.log('ALTER TABLE access_logs ADD COLUMN referer TEXT;');
    }
    
    // Verificar se o campo country aceita nomes completos
    console.log('\n🧪 Testando se o campo country aceita nomes completos...');
    const testRecord = {
      domain: 'test-country.com',
      path: '/test',
      method: 'GET',
      status_code: 200,
      client_ip: '192.168.1.1',
      user_agent: 'Test Agent',
      device_type: 'desktop',
      country: 'Brasil' // Nome completo
    };
    
    const { data: testData, error: testError } = await supabase
      .from('access_logs')
      .insert([testRecord])
      .select('id, country');
    
    if (testError) {
      if (testError.message.includes('value too long for type character varying(2)')) {
        console.log('❌ Campo country ainda está limitado a VARCHAR(2)');
        console.log('📝 Execute também: ALTER TABLE access_logs ALTER COLUMN country TYPE VARCHAR(100);');
      } else {
        console.error('❌ Erro no teste do campo country:', testError);
      }
    } else {
      console.log('✅ Campo country aceita nomes completos!');
      console.log(`   Teste inserido: ${testData[0].country} (ID: ${testData[0].id})`);
      
      // Remover o registro de teste
      await supabase.from('access_logs').delete().eq('id', testData[0].id);
      console.log('🗑️ Registro de teste removido');
    }
    
    console.log('\n📋 Resumo das alterações necessárias:');
    console.log('1. Adicionar campo "city" (VARCHAR(100))');
    console.log('2. Adicionar campo "referer" (TEXT)');
    console.log('3. Alterar campo "country" para VARCHAR(100) se necessário');
    
    console.log('\n🔗 Links úteis:');
    console.log('- Painel Supabase: https://supabase.com/dashboard/project/jyconxalcfqvqakrswnb');
    console.log('- Table Editor: https://supabase.com/dashboard/project/jyconxalcfqvqakrswnb/editor');
    console.log('- SQL Editor: https://supabase.com/dashboard/project/jyconxalcfqvqakrswnb/sql');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
addMissingFields();