const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccessLogsStructure() {
  console.log('🔍 [STRUCTURE] Verificando estrutura da tabela access_logs...\n');
  
  try {
    // Primeiro, vamos tentar buscar alguns registros para ver as colunas disponíveis
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ [STRUCTURE] Erro ao buscar access_logs:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ [STRUCTURE] Tabela access_logs está vazia');
      return;
    }
    
    console.log(`✅ [STRUCTURE] Tabela access_logs encontrada com ${data.length} registros de exemplo`);
    console.log('\n📊 [STRUCTURE] Estrutura das colunas (baseada nos dados):');
    
    // Analisar a estrutura baseada no primeiro registro
    const firstRecord = data[0];
    Object.keys(firstRecord).forEach((column, index) => {
      const value = firstRecord[column];
      const type = typeof value;
      console.log(`   ${index + 1}. ${column}: ${type} (exemplo: ${JSON.stringify(value)})`);
    });
    
    console.log('\n📋 [STRUCTURE] Registros de exemplo:');
    data.forEach((record, index) => {
      console.log(`\n${index + 1}. Registro:`);
      Object.entries(record).forEach(([key, value]) => {
        console.log(`   ${key}: ${JSON.stringify(value)}`);
      });
    });
    
  } catch (error) {
    console.error('❌ [STRUCTURE] Erro inesperado:', error);
  }
}

async function tryDifferentDateColumns() {
  console.log('\n🕐 [DATE] Testando diferentes colunas de data...\n');
  
  const possibleDateColumns = [
    'timestamp',
    'created_at',
    'date',
    'time',
    'request_time',
    'access_time',
    'log_time'
  ];
  
  for (const column of possibleDateColumns) {
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select(column)
        .limit(1);
      
      if (!error && data && data.length > 0) {
        console.log(`✅ [DATE] Coluna '${column}' existe:`, data[0][column]);
      } else {
        console.log(`❌ [DATE] Coluna '${column}' não existe ou está vazia`);
      }
    } catch (error) {
      console.log(`❌ [DATE] Erro ao testar coluna '${column}':`, error.message);
    }
  }
}

async function searchForIPInLogs() {
  console.log('\n🔍 [IP-SEARCH] Procurando IPs conhecidos nos logs...\n');
  
  const knownIPs = ['201.182.93.164', '170.238.121.42', '8.8.8.8'];
  
  for (const ip of knownIPs) {
    try {
      // Tentar diferentes colunas de IP
      const ipColumns = ['client_ip', 'ip', 'remote_ip', 'source_ip'];
      
      for (const column of ipColumns) {
        try {
          const { data, error } = await supabase
            .from('access_logs')
            .select('*')
            .eq(column, ip)
            .limit(1);
          
          if (!error && data && data.length > 0) {
            console.log(`✅ [IP-SEARCH] IP ${ip} encontrado na coluna '${column}':`);
            console.log('   Registro:', JSON.stringify(data[0], null, 2));
            break;
          }
        } catch (e) {
          // Coluna não existe, continuar
        }
      }
    } catch (error) {
      console.log(`❌ [IP-SEARCH] Erro ao buscar IP ${ip}:`, error.message);
    }
  }
}

async function main() {
  console.log('🔍 [MAIN] Iniciando análise da estrutura da tabela access_logs\n');
  console.log('=' .repeat(60));
  
  await checkAccessLogsStructure();
  console.log('=' .repeat(60));
  
  await tryDifferentDateColumns();
  console.log('=' .repeat(60));
  
  await searchForIPInLogs();
  console.log('=' .repeat(60));
  
  console.log('\n✅ [MAIN] Análise da estrutura concluída');
}

main().catch(console.error);