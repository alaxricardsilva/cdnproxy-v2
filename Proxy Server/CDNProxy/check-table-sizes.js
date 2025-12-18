SELECT schemaname, tablename, n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getTableSizes() {
  try {
    console.log('🔍 [SUPABASE] Verificando tamanhos das tabelas...\n');

    // Query SQL para obter tamanhos das tabelas
    const { data: tableSizes, error } = await supabase.rpc('get_table_sizes');
    
    if (error) {
      console.log('⚠️ [SUPABASE] Função get_table_sizes não existe, usando query alternativa...\n');
      
      // Query alternativa usando pg_stat_user_tables
      const { data: altTableSizes, error: altError } = await supabase
        .from('pg_stat_user_tables')
        .select('schemaname, relname, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup')
        .order('n_live_tup', { ascending: false });
      
      if (altError) {
        console.log('⚠️ [SUPABASE] Tentando query direta para informações de tabelas...\n');
        
        // Lista das principais tabelas do sistema
        const mainTables = [
          'access_logs',
          'analytics_data', 
          'domains',
          'users',
          'transactions',
          'hls_metrics',
          'streaming_metrics',
          'domain_analytics',
          'geolocation_cache',
          'notifications',
          'plans'
        ];
        
        const tableInfo = [];
        
        for (const tableName of mainTables) {
          try {
            // Contar registros na tabela
            const { count, error: countError } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            
            if (!countError) {
              tableInfo.push({
                table_name: tableName,
                row_count: count || 0,
                status: 'exists'
              });
              console.log(`✅ [${tableName}] ${count || 0} registros`);
            } else {
              tableInfo.push({
                table_name: tableName,
                row_count: 0,
                status: 'not_exists_or_empty'
              });
              console.log(`❌ [${tableName}] Tabela não existe ou erro: ${countError.message}`);
            }
          } catch (err) {
            tableInfo.push({
              table_name: tableName,
              row_count: 0,
              status: 'error'
            });
            console.log(`💥 [${tableName}] Erro: ${err.message}`);
          }
        }
        
        // Ordenar por número de registros (maior para menor)
        tableInfo.sort((a, b) => b.row_count - a.row_count);
        
        console.log('\n📊 [SUPABASE] Resumo das tabelas ordenadas por tamanho:');
        console.log('=' .repeat(60));
        
        tableInfo.forEach((table, index) => {
          const position = (index + 1).toString().padStart(2, '0');
          const name = table.table_name.padEnd(20, ' ');
          const count = table.row_count.toString().padStart(10, ' ');
          const status = table.status.padEnd(15, ' ');
          
          console.log(`${position}. ${name} | ${count} registros | ${status}`);
        });
        
        console.log('=' .repeat(60));
        
        // Sugestões para configuração
        console.log('\n💡 [SUPABASE] Sugestões para configuração:');
        console.log('1. Para ordenar tabelas por tamanho no dashboard do Supabase:');
        console.log('   - Acesse o Supabase Dashboard > Table Editor');
        console.log('   - Use a query SQL personalizada no SQL Editor:');
        console.log('');
        console.log('   SELECT schemaname, tablename, n_live_tup as row_count');
        console.log('   FROM pg_stat_user_tables');
        console.log('   WHERE schemaname = \'public\'');
        console.log('   ORDER BY n_live_tup DESC;');
        console.log('');
        console.log('2. Para criar uma view personalizada:');
        console.log('   CREATE VIEW table_sizes_view AS');
        console.log('   SELECT schemaname, tablename, n_live_tup as row_count,');
        console.log('          pg_size_pretty(pg_total_relation_size(schemaname||\'.\' ||tablename)) as size');
        console.log('   FROM pg_stat_user_tables');
        console.log('   WHERE schemaname = \'public\'');
        console.log('   ORDER BY n_live_tup DESC;');
        console.log('');
        console.log('3. Para monitoramento contínuo, considere criar uma função:');
        console.log('   CREATE OR REPLACE FUNCTION get_table_sizes()');
        console.log('   RETURNS TABLE(table_name text, row_count bigint, size_pretty text)');
        console.log('   LANGUAGE sql');
        console.log('   AS $$');
        console.log('     SELECT tablename::text, n_live_tup,');
        console.log('            pg_size_pretty(pg_total_relation_size(schemaname||\'.\' ||tablename))');
        console.log('     FROM pg_stat_user_tables');
        console.log('     WHERE schemaname = \'public\'');
        console.log('     ORDER BY n_live_tup DESC;');
        console.log('   $$;');
        
        return tableInfo;
      } else {
        console.log('✅ [SUPABASE] Dados obtidos via pg_stat_user_tables:');
        altTableSizes.forEach((table, index) => {
          console.log(`${index + 1}. ${table.relname}: ${table.n_live_tup} registros ativos`);
        });
        return altTableSizes;
      }
    } else {
      console.log('✅ [SUPABASE] Tamanhos das tabelas obtidos via função personalizada:');
      tableSizes.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name}: ${table.row_count} registros (${table.size_pretty})`);
      });
      return tableSizes;
    }
    
  } catch (error) {
    console.error('❌ [SUPABASE] Erro ao verificar tamanhos das tabelas:', error.message);
    return null;
  }
}

// Executar verificação
getTableSizes().then((result) => {
  if (result) {
    console.log('\n✅ [SUPABASE] Verificação de tamanhos concluída!');
    console.log('\n📋 [INSTRUÇÕES] Para configurar no frontend:');
    console.log('1. No servidor frontend, acesse o dashboard do Supabase');
    console.log('2. Vá para SQL Editor e execute as queries sugeridas acima');
    console.log('3. Crie views personalizadas para ordenação automática');
    console.log('4. Configure dashboards personalizados com as views criadas');
  } else {
    console.log('❌ [SUPABASE] Falha na verificação de tamanhos');
  }
  process.exit(0);
}).catch((error) => {
  console.error('💥 [SUPABASE] Erro fatal:', error);
  process.exit(1);
});