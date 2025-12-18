const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanTestData() {
  try {
    console.log('🧹 Iniciando limpeza de dados de teste...\n');

    // 1. Remover registros de teste da tabela access_logs
    console.log('📊 1. Limpando tabela access_logs...');
    
    // Remover registros com domínios de teste
    const { data: testLogs, error: deleteLogsError } = await supabase
      .from('access_logs')
      .delete()
      .or('domain.like.%test%,domain.like.%exemplo%,domain.like.%demo%,client_ip.eq.191.177.200.100,client_ip.eq.8.8.8.8,client_ip.eq.1.1.1.1')
      .select();

    if (deleteLogsError) {
      console.error('❌ Erro ao limpar access_logs:', deleteLogsError);
    } else {
      console.log(`✅ Removidos ${testLogs?.length || 0} registros de teste da tabela access_logs`);
    }

    // 2. Remover registros de teste da tabela ip_geo_cache
    console.log('\n🌍 2. Limpando tabela ip_geo_cache...');
    
    const { data: testCache, error: deleteCacheError } = await supabase
      .from('ip_geo_cache')
      .delete()
      .or('ip.eq.191.177.200.100,ip.eq.8.8.8.8,ip.eq.1.1.1.1,ip.eq.127.0.0.1')
      .select();

    if (deleteCacheError) {
      console.error('❌ Erro ao limpar ip_geo_cache:', deleteCacheError);
    } else {
      console.log(`✅ Removidos ${testCache?.length || 0} registros de teste da tabela ip_geo_cache`);
    }

    // 3. Remover domínios de teste (se existirem)
    console.log('\n🌐 3. Limpando domínios de teste...');
    
    const { data: testDomains, error: deleteDomainsError } = await supabase
      .from('domains')
      .delete()
      .or('domain.like.%test%,domain.like.%exemplo%,domain.like.%demo%')
      .select();

    if (deleteDomainsError) {
      console.error('❌ Erro ao limpar domains:', deleteDomainsError);
    } else {
      console.log(`✅ Removidos ${testDomains?.length || 0} domínios de teste`);
    }

    // 4. Verificar estatísticas finais
    console.log('\n📊 4. Verificando estatísticas finais...');
    
    const { count: totalLogs } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true });

    const { count: totalCache } = await supabase
      .from('ip_geo_cache')
      .select('*', { count: 'exact', head: true });

    const { count: totalDomains } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true });

    console.log(`📈 Total de registros restantes:`);
    console.log(`   - access_logs: ${totalLogs}`);
    console.log(`   - ip_geo_cache: ${totalCache}`);
    console.log(`   - domains: ${totalDomains}`);

    // 5. Mostrar alguns registros reais recentes
    console.log('\n📋 5. Últimos 5 registros reais de access_logs:');
    
    const { data: recentLogs } = await supabase
      .from('access_logs')
      .select('domain, client_ip, country, device_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentLogs && recentLogs.length > 0) {
      recentLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.domain} | IP: ${log.client_ip} | País: ${log.country || 'N/A'} | Device: ${log.device_type || 'N/A'}`);
      });
    } else {
      console.log('   Nenhum registro encontrado');
    }

    console.log('\n🎉 Limpeza de dados de teste concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

cleanTestData();