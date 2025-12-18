const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeCompleteDatabase() {
  console.log('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS');
  console.log('=====================================\n');

  // Lista de tabelas conhecidas para análise
  const knownTables = [
    'ip_geo_cache',
    'geolocation_cache', 
    'access_logs',
    'analytics_data',
    'users',
    'user_plans',
    'transactions',
    'streaming_metrics',
    'profiles'
  ];

  const existingTables = [];

  try {
    // 1. Verificar quais tabelas existem
    console.log('📋 1. VERIFICANDO TABELAS EXISTENTES:');
    console.log('===================================\n');

    for (const tableName of knownTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          existingTables.push(tableName);
          console.log(`✅ ${tableName} - EXISTE`);
        } else {
          console.log(`❌ ${tableName} - NÃO EXISTE (${error.message})`);
        }
      } catch (e) {
        console.log(`❌ ${tableName} - ERRO: ${e.message}`);
      }
    }

    console.log(`\n📊 Total de tabelas encontradas: ${existingTables.length}`);
    console.log(`📋 Tabelas existentes: ${existingTables.join(', ')}\n`);

    // 2. Análise detalhada de cada tabela existente
    console.log('🏗️  2. ANÁLISE DETALHADA DE CADA TABELA:');
    console.log('======================================\n');

    for (const tableName of existingTables) {
      console.log(`📊 TABELA: ${tableName.toUpperCase()}`);
      console.log('='.repeat(50));

      try {
        // Obter alguns registros para análise da estrutura
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(3);

        if (sampleError) {
          console.error(`❌ Erro ao obter dados de ${tableName}:`, sampleError);
          continue;
        }

        // Contar total de registros
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        console.log(`📈 Total de registros: ${count || 'N/A'}`);

        if (sampleData && sampleData.length > 0) {
          console.log('\n🏗️  Estrutura da tabela (baseada nos dados):');
          const columns = Object.keys(sampleData[0]);
          columns.forEach(col => {
            const sampleValue = sampleData[0][col];
            const dataType = typeof sampleValue;
            console.log(`  - ${col}: ${dataType} (exemplo: ${sampleValue})`);
          });

          console.log('\n📋 Primeiros registros:');
          sampleData.forEach((record, index) => {
            console.log(`\n  Registro ${index + 1}:`);
            Object.entries(record).forEach(([key, value]) => {
              console.log(`    ${key}: ${value}`);
            });
          });
        }

        console.log('\n');

      } catch (error) {
        console.error(`❌ Erro ao analisar ${tableName}:`, error);
      }
    }

    // 3. Busca específica pelo IP 201.182.93.164
    console.log('🎯 3. BUSCA ESPECÍFICA PELO IP 201.182.93.164:');
    console.log('============================================\n');

    const ipColumns = ['ip', 'client_ip', 'user_ip', 'remote_ip', 'source_ip'];
    let ipFound = false;

    for (const tableName of existingTables) {
      console.log(`🔍 Verificando tabela: ${tableName}`);
      
      for (const ipCol of ipColumns) {
        try {
          const { data: ipData, error: ipError } = await supabase
            .from(tableName)
            .select('*')
            .eq(ipCol, '201.182.93.164');

          if (!ipError && ipData && ipData.length > 0) {
            console.log(`🎯 IP ENCONTRADO na tabela ${tableName}, coluna ${ipCol}:`);
            console.log('📋 Dados completos:');
            ipData.forEach((record, index) => {
              console.log(`\n  Registro ${index + 1}:`);
              Object.entries(record).forEach(([key, value]) => {
                console.log(`    ${key}: ${value}`);
              });
            });
            ipFound = true;
          }
        } catch (e) {
          // Coluna não existe, continuar
        }
      }
      console.log('');
    }

    if (!ipFound) {
      console.log('❌ IP 201.182.93.164 NÃO ENCONTRADO em nenhuma tabela');
    }

    // 4. Análise específica da tabela ip_geo_cache
    console.log('\n🌍 4. ANÁLISE ESPECÍFICA DA TABELA IP_GEO_CACHE:');
    console.log('==============================================\n');

    if (existingTables.includes('ip_geo_cache')) {
      const { data: allIpData, error: allIpError } = await supabase
        .from('ip_geo_cache')
        .select('*')
        .order('created_at', { ascending: false });

      if (!allIpError && allIpData) {
        console.log(`📊 Total de IPs na cache: ${allIpData.length}`);
        
        allIpData.forEach((record, index) => {
          console.log(`\n🔍 IP ${index + 1}: ${record.ip}`);
          console.log(`  País: ${record.country || 'N/A'}`);
          console.log(`  Cidade: ${record.city || 'N/A'}`);
          console.log(`  ISP: ${record.isp || 'N/A'}`);
          console.log(`  Coordenadas: ${record.latitude || 'N/A'}, ${record.longitude || 'N/A'}`);
          console.log(`  Criado em: ${record.created_at}`);
          console.log(`  Cache em: ${record.cached_at}`);
          
          // Análise da qualidade dos dados
          const hasRealData = record.country && record.city && record.isp && 
                             record.latitude && record.longitude &&
                             record.country !== 'Unknown' && record.city !== 'Unknown';
          
          console.log(`  ✅ Qualidade dos dados: ${hasRealData ? 'REAIS/COMPLETOS' : 'FICTÍCIOS/INCOMPLETOS'}`);
          
          if (record.ip === '201.182.93.164') {
            console.log('  🎯 ESTE É O IP QUE ESTAMOS INVESTIGANDO!');
            
            // Análise temporal
            const createdTime = new Date(record.created_at);
            const cachedTime = new Date(record.cached_at);
            const timeDiff = cachedTime - createdTime;
            
            console.log(`  ⏱️  Diferença temporal: ${timeDiff}ms`);
            console.log(`  🤖 Tipo de inserção: ${timeDiff < 2000 ? 'AUTOMÁTICA' : 'MANUAL'}`);
            
            // Verificar se os dados são de uma API real
            if (record.latitude && record.longitude) {
              console.log(`  🌐 Coordenadas válidas: Lat ${record.latitude}, Lng ${record.longitude}`);
              console.log(`  📍 Localização: ${record.city}, ${record.country}`);
            }
          }
        });
      }
    }

    // 5. Análise de logs de acesso
    console.log('\n📝 5. ANÁLISE DE LOGS DE ACESSO:');
    console.log('==============================\n');

    if (existingTables.includes('access_logs')) {
      // Buscar logs recentes
      const { data: recentLogs, error: logsError } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!logsError && recentLogs) {
        console.log(`📊 Logs de acesso recentes (últimos 10):`);
        recentLogs.forEach((log, index) => {
          console.log(`\n  Log ${index + 1}:`);
          Object.entries(log).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });
        });

        // Buscar especificamente pelo IP
        const { data: ipLogs, error: ipLogsError } = await supabase
          .from('access_logs')
          .select('*')
          .or('client_ip.eq.201.182.93.164,user_ip.eq.201.182.93.164,remote_ip.eq.201.182.93.164')
          .order('created_at', { ascending: false });

        if (!ipLogsError && ipLogs && ipLogs.length > 0) {
          console.log(`\n🎯 Logs específicos do IP 201.182.93.164:`);
          ipLogs.forEach((log, index) => {
            console.log(`\n  Log ${index + 1}:`);
            Object.entries(log).forEach(([key, value]) => {
              console.log(`    ${key}: ${value}`);
            });
          });
        }
      }
    }

    // 6. Resumo e recomendações
    console.log('\n🎯 RESUMO DA ANÁLISE COMPLETA:');
    console.log('============================');
    console.log(`✅ Tabelas analisadas: ${existingTables.length}`);
    console.log(`📊 Tabelas existentes: ${existingTables.join(', ')}`);
    console.log(`🔍 IP 201.182.93.164 encontrado: ${ipFound ? 'SIM' : 'NÃO'}`);
    
    console.log('\n🔧 PRÓXIMOS PASSOS RECOMENDADOS:');
    console.log('1. Analisar o código do proxy-server.js');
    console.log('2. Verificar as funções de geolocalização');
    console.log('3. Identificar inconsistências entre código e banco');
    console.log('4. Verificar se há problemas na inserção de novos IPs');
    console.log('5. Implementar correções necessárias');

  } catch (error) {
    console.error('❌ Erro geral na análise:', error);
  }
}

// Executar análise
analyzeCompleteDatabase();