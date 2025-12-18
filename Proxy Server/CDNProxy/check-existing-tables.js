const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  try {
    console.log('🔍 [CHECK] Verificando tabelas existentes no Supabase...');

    // Tentar diferentes nomes de tabelas relacionadas a geolocalização
    const possibleTables = [
      'geolocation_cache',
      'ip_geo_cache', 
      'geo_cache',
      'ip_cache',
      'location_cache',
      'geoip_cache'
    ];

    for (const tableName of possibleTables) {
      try {
        console.log(`🔍 [CHECK] Verificando tabela: ${tableName}`);
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ [CHECK] Tabela ${tableName} não existe:`, error.message);
        } else {
          console.log(`✅ [CHECK] Tabela ${tableName} existe! Dados:`, data);
          
          // Se encontrou a tabela, verificar sua estrutura
          if (data && data.length > 0) {
            console.log(`📋 [CHECK] Estrutura da tabela ${tableName}:`, Object.keys(data[0]));
          }
        }
      } catch (tableError) {
        console.log(`❌ [CHECK] Erro ao verificar ${tableName}:`, tableError.message);
      }
    }

    // Tentar verificar se existe alguma tabela com 'geo' no nome
    console.log('🔍 [CHECK] Tentando listar todas as tabelas...');
    
    // Usar uma query simples para verificar se conseguimos acessar alguma tabela conhecida
    const knownTables = ['access_logs', 'analytics_data', 'domains', 'users'];
    
    for (const tableName of knownTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          console.log(`✅ [CHECK] Tabela conhecida ${tableName} existe`);
        } else {
          console.log(`❌ [CHECK] Tabela conhecida ${tableName} não existe:`, error.message);
        }
      } catch (err) {
        console.log(`❌ [CHECK] Erro ao verificar ${tableName}:`, err.message);
      }
    }

  } catch (error) {
    console.error('💥 [CHECK] Erro geral:', error);
  }
}

// Executar o script
checkTables();