const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeCompleteDatabase() {
  console.log('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS');
  console.log('=====================================\n');

  try {
    // 1. Listar todas as tabelas do banco
    console.log('📋 1. LISTANDO TODAS AS TABELAS DO BANCO:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tablesError) {
      console.error('❌ Erro ao listar tabelas:', tablesError);
      return;
    }

    const tableNames = tables.map(t => t.table_name);
    console.log('Tabelas encontradas:', tableNames);
    console.log('\n');

    // 2. Analisar estrutura de cada tabela
    console.log('🏗️  2. ANALISANDO ESTRUTURA DE CADA TABELA:');
    console.log('===========================================\n');

    for (const tableName of tableNames) {
      console.log(`📊 Tabela: ${tableName}`);
      console.log('-'.repeat(50));

      // Obter estrutura da tabela
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (columnsError) {
        console.error(`❌ Erro ao obter colunas da tabela ${tableName}:`, columnsError);
        continue;
      }

      console.log('Colunas:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
      });

      // Contar registros
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`📈 Total de registros: ${count}`);
      }

      console.log('\n');
    }

    // 3. Análise específica das tabelas de geolocalização
    console.log('🌍 3. ANÁLISE ESPECÍFICA DAS TABELAS DE GEOLOCALIZAÇÃO:');
    console.log('=====================================================\n');

    const geoTables = ['ip_geo_cache', 'geolocation_cache', 'access_logs'];
    
    for (const table of geoTables) {
      if (tableNames.includes(table)) {
        console.log(`🔍 Analisando tabela: ${table}`);
        console.log('-'.repeat(40));

        // Buscar todos os registros
        const { data: records, error: recordsError } = await supabase
          .from(table)
          .select('*')
          .limit(100);

        if (recordsError) {
          console.error(`❌ Erro ao buscar registros de ${table}:`, recordsError);
          continue;
        }

        console.log(`📊 Primeiros registros (máximo 5):`);
        records.slice(0, 5).forEach((record, index) => {
          console.log(`  Registro ${index + 1}:`, JSON.stringify(record, null, 2));
        });

        // Buscar especificamente o IP 201.182.93.164
        const ipColumns = ['ip', 'client_ip', 'user_ip', 'remote_ip'];
        let foundIP = false;

        for (const ipCol of ipColumns) {
          const hasColumn = records.length > 0 && records[0].hasOwnProperty(ipCol);
          if (hasColumn) {
            const { data: ipData, error: ipError } = await supabase
              .from(table)
              .select('*')
              .eq(ipCol, '201.182.93.164');

            if (!ipError && ipData && ipData.length > 0) {
              console.log(`🎯 IP 201.182.93.164 encontrado na coluna ${ipCol}:`);
              console.log(JSON.stringify(ipData, null, 2));
              foundIP = true;
            }
          }
        }

        if (!foundIP) {
          console.log('❌ IP 201.182.93.164 não encontrado nesta tabela');
        }

        console.log('\n');
      }
    }

    // 4. Análise de dados suspeitos/fictícios
    console.log('🕵️  4. ANÁLISE DE DADOS SUSPEITOS/FICTÍCIOS:');
    console.log('==========================================\n');

    // Verificar dados na ip_geo_cache
    const { data: ipGeoData, error: ipGeoError } = await supabase
      .from('ip_geo_cache')
      .select('*');

    if (!ipGeoError && ipGeoData) {
      console.log('📊 Análise da tabela ip_geo_cache:');
      console.log(`Total de registros: ${ipGeoData.length}`);
      
      ipGeoData.forEach((record, index) => {
        console.log(`\n🔍 Registro ${index + 1}:`);
        console.log(`  IP: ${record.ip}`);
        console.log(`  País: ${record.country}`);
        console.log(`  Cidade: ${record.city}`);
        console.log(`  ISP: ${record.isp}`);
        console.log(`  Latitude: ${record.latitude}`);
        console.log(`  Longitude: ${record.longitude}`);
        console.log(`  Created At: ${record.created_at}`);
        console.log(`  Cached At: ${record.cached_at}`);
        
        // Verificar se os dados parecem reais ou fictícios
        const isRealData = record.latitude && record.longitude && 
                          record.country && record.city && record.isp &&
                          record.country !== 'Unknown' && record.city !== 'Unknown';
        
        console.log(`  ✅ Dados parecem ${isRealData ? 'REAIS' : 'FICTÍCIOS/INCOMPLETOS'}`);
        
        if (record.ip === '201.182.93.164') {
          console.log('  🎯 ESTE É O IP QUE ESTAMOS ANALISANDO!');
          
          // Verificar se foi inserido automaticamente ou manualmente
          const timeDiff = new Date(record.cached_at) - new Date(record.created_at);
          console.log(`  ⏱️  Diferença de tempo entre created_at e cached_at: ${timeDiff}ms`);
          
          if (timeDiff < 1000) {
            console.log('  🤖 Provavelmente inserido automaticamente (diferença < 1s)');
          } else {
            console.log('  👤 Provavelmente inserido manualmente (diferença > 1s)');
          }
        }
      });
    }

    // 5. Verificar logs de acesso para rastrear inserções
    console.log('\n📝 5. VERIFICANDO LOGS DE ACESSO:');
    console.log('===============================\n');

    if (tableNames.includes('access_logs')) {
      const { data: accessLogs, error: accessError } = await supabase
        .from('access_logs')
        .select('*')
        .or('client_ip.eq.201.182.93.164,user_ip.eq.201.182.93.164,remote_ip.eq.201.182.93.164')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!accessError && accessLogs && accessLogs.length > 0) {
        console.log('🎯 Logs de acesso encontrados para o IP 201.182.93.164:');
        accessLogs.forEach((log, index) => {
          console.log(`\nLog ${index + 1}:`);
          console.log(JSON.stringify(log, null, 2));
        });
      } else {
        console.log('❌ Nenhum log de acesso encontrado para o IP 201.182.93.164');
      }
    }

    console.log('\n🎯 RESUMO DA ANÁLISE:');
    console.log('====================');
    console.log(`✅ Total de tabelas analisadas: ${tableNames.length}`);
    console.log(`📊 Tabelas encontradas: ${tableNames.join(', ')}`);
    console.log('\n🔍 Próximos passos recomendados:');
    console.log('1. Verificar o código do proxy-server.js');
    console.log('2. Analisar as funções de geolocalização');
    console.log('3. Identificar inconsistências entre código e banco');
    console.log('4. Implementar correções necessárias');

  } catch (error) {
    console.error('❌ Erro geral na análise:', error);
  }
}

// Executar análise
analyzeCompleteDatabase();