const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// Configuração do Supabase usando credenciais de produção
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Credenciais do Supabase não encontradas no .env.production');
  process.exit(1);
}

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lista de tabelas esperadas baseada no script SQL
const expectedTables = [
  'users',
  'domains', 
  'access_logs',
  'analytics',
  'analytics_data',
  'transactions',
  'plans',
  'profiles',
  'system_logs',
  'notifications',
  'hls_metrics',
  'streaming_metrics',
  'domain_analytics',
  'geolocation_cache',
  'ip_geo_cache',
  'monitoring_api_keys',
  'reports'
];

// Estrutura esperada das colunas para cada tabela
const expectedColumns = {
  users: ['id', 'email', 'name', 'role', 'status', 'last_login', 'created_at', 'updated_at'],
  domains: ['id', 'user_id', 'domain', 'active', 'created_at', 'updated_at'],
  access_logs: ['id', 'domain_id', 'domain', 'path', 'method', 'status', 'response_time', 'client_ip', 'user_agent', 'country', 'cache_status', 'bytes_sent', 'created_at'],
  analytics: ['id', 'user_id', 'domain_id', 'requests_count', 'unique_visitors', 'bandwidth_used', 'created_at'],
  analytics_data: ['id', 'date', 'total_requests', 'unique_visitors', 'total_bandwidth', 'countries', 'user_agents', 'created_at'],
  transactions: ['id', 'user_id', 'amount', 'status', 'type', 'description', 'created_at', 'updated_at'],
  plans: ['id', 'name', 'description', 'price', 'features', 'active', 'created_at', 'updated_at'],
  profiles: ['id', 'user_id', 'avatar_url', 'bio', 'preferences', 'created_at', 'updated_at'],
  system_logs: ['id', 'level', 'message', 'service', 'details', 'created_at'],
  notifications: ['id', 'user_id', 'title', 'message', 'type', 'read', 'created_at'],
  hls_metrics: ['id', 'domain_id', 'segment_requests', 'playlist_requests', 'bandwidth_used', 'created_at'],
  streaming_metrics: ['id', 'domain_id', 'concurrent_viewers', 'total_views', 'peak_viewers', 'created_at'],
  domain_analytics: ['id', 'domain_id', 'date', 'requests', 'unique_visitors', 'bandwidth', 'created_at'],
  geolocation_cache: ['id', 'ip_address', 'country', 'country_name', 'region', 'city', 'latitude', 'longitude', 'created_at'],
  ip_geo_cache: ['id', 'ip_address', 'country_code', 'country_name', 'region', 'city', 'created_at'],
  monitoring_api_keys: ['id', 'name', 'description', 'api_key', 'is_active', 'last_used_at', 'expires_at', 'created_at'],
  reports: ['id', 'title', 'type', 'period', 'format', 'status', 'data', 'generated_by', 'generated_at', 'file_size']
};

async function checkDatabaseStructure() {
  console.log('🔍 [SUPABASE] Verificando estrutura do banco de dados...\n');
  console.log(`📡 Conectando em: ${supabaseUrl}`);
  console.log(`🔑 Usando Service Role Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

  try {
    // 1. Verificar conexão testando uma tabela conhecida
    console.log('1️⃣ Testando conexão com Supabase...');
    
    // Tentar acessar uma tabela que provavelmente existe (users ou auth.users)
    let connectionTest = false;
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (!testError) {
        connectionTest = true;
      }
    } catch (e) {
      // Tentar com auth.users se users não existir
      try {
        const { data: authTest, error: authError } = await supabase.auth.getUser();
        connectionTest = true;
      } catch (authE) {
        console.error('❌ Erro na conexão:', authE.message);
        return;
      }
    }
    
    if (connectionTest) {
      console.log('✅ Conexão estabelecida com sucesso!\n');
    }

    // 2. Listar todas as tabelas existentes testando cada uma
    console.log('2️⃣ Verificando tabelas existentes...');
    let actualTables = [];
    
    // Testar cada tabela esperada individualmente
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          actualTables.push(tableName);
          console.log(`✅ Tabela encontrada: ${tableName}`);
        } else {
          console.log(`❌ Tabela não encontrada: ${tableName} (${error.message})`);
        }
      } catch (e) {
        console.log(`❌ Tabela não encontrada: ${tableName} (${e.message})`);
      }
    }

    console.log(`📋 Encontradas ${actualTables.length} tabelas:`);
    actualTables.forEach(table => console.log(`   • ${table}`));
    console.log('');

    // 3. Comparar tabelas esperadas vs existentes
    console.log('3️⃣ Comparando tabelas esperadas vs existentes...');
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    const extraTables = actualTables.filter(table => !expectedTables.includes(table));

    if (missingTables.length > 0) {
      console.log('❌ TABELAS FALTANTES:');
      missingTables.forEach(table => console.log(`   • ${table}`));
    } else {
      console.log('✅ Todas as tabelas esperadas estão presentes!');
    }

    if (extraTables.length > 0) {
      console.log('\n📝 TABELAS EXTRAS (não esperadas):');
      extraTables.forEach(table => console.log(`   • ${table}`));
    }
    console.log('');

    // 4. Verificar estrutura das colunas para tabelas existentes
    console.log('\n4️⃣ Verificando estrutura das colunas...');
    const columnIssues = [];

    for (const tableName of actualTables) {
      console.log(`\n🔍 Verificando colunas da tabela: ${tableName}`);
      
      try {
        // Tentar obter uma linha da tabela para ver as colunas
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (sampleError) {
          console.error(`❌ Erro ao acessar ${tableName}:`, sampleError.message);
          continue;
        }

        // Se temos dados, podemos ver as colunas
        let existingColumns = [];
        if (sampleData && sampleData.length > 0) {
          existingColumns = Object.keys(sampleData[0]);
        } else {
          // Se não há dados, tentar inserir um registro vazio para ver quais colunas são obrigatórias
          console.log(`⚠️ Tabela ${tableName} está vazia, tentando descobrir estrutura...`);
          
          // Para tabelas vazias, vamos assumir que as colunas básicas existem
          // e verificar apenas se conseguimos acessar a tabela
          existingColumns = ['id']; // Assumir pelo menos ID existe
        }

        const expectedCols = expectedColumns[tableName] || [];
        const missingColumns = expectedCols.filter(col => !existingColumns.includes(col));

        if (missingColumns.length > 0) {
          console.log(`❌ Possíveis colunas faltantes em ${tableName}:`);
          missingColumns.forEach(col => console.log(`     • ${col}`));
          columnIssues.push({ table: tableName, missingColumns });
        } else {
          console.log(`✅ Estrutura básica de ${tableName} parece estar correta`);
        }

        // Mostrar colunas encontradas
        if (existingColumns.length > 0) {
          console.log(`📋 Colunas encontradas (${existingColumns.length}):`);
          existingColumns.forEach(col => {
            console.log(`     • ${col}`);
          });
        }
      } catch (e) {
        console.error(`❌ Erro ao verificar ${tableName}:`, e.message);
      }
    }

    // 5. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA VERIFICAÇÃO:');
    console.log('='.repeat(60));
    console.log(`✅ Tabelas existentes: ${actualTables.length}`);
    console.log(`❌ Tabelas faltantes: ${missingTables.length}`);
    console.log(`📝 Tabelas extras: ${extraTables.length}`);
    console.log(`🔧 Tabelas com colunas faltantes: ${columnIssues.length}`);

    // 6. Gerar script de correção se necessário
    if (missingTables.length > 0 || columnIssues.length > 0) {
      console.log('\n🔧 GERANDO SCRIPT DE CORREÇÃO...');
      await generateCorrectionScript(missingTables, columnIssues);
    } else {
      console.log('\n🎉 BANCO DE DADOS ESTÁ COMPLETO!');
      console.log('Todas as tabelas e colunas necessárias estão presentes.');
    }

  } catch (error) {
    console.error('💥 Erro durante verificação:', error.message);
    if (error.code) console.error('Código do erro:', error.code);
    if (error.details) console.error('Detalhes:', error.details);
  }
}

async function generateCorrectionScript(missingTables, columnIssues) {
  const fs = require('fs');
  let script = `-- =====================================================
-- SCRIPT DE CORREÇÃO DO BANCO DE DADOS SUPABASE
-- Gerado automaticamente em ${new Date().toISOString()}
-- =====================================================

`;

  // Adicionar tabelas faltantes
  if (missingTables.length > 0) {
    script += `-- =====================================================
-- CRIANDO TABELAS FALTANTES
-- =====================================================

`;

    // Ler o script original para extrair as definições das tabelas faltantes
    const originalScript = fs.readFileSync('/www/wwwroot/CDNProxy/supabase_database_setup.sql', 'utf8');
    
    for (const tableName of missingTables) {
      console.log(`📝 Adicionando definição da tabela: ${tableName}`);
      
      // Extrair definição da tabela do script original
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}[\\s\\S]*?;`, 'i');
      const match = originalScript.match(tableRegex);
      
      if (match) {
        script += `-- Tabela: ${tableName}\n`;
        script += match[0] + '\n\n';
      }
    }
  }

  // Adicionar colunas faltantes
  if (columnIssues.length > 0) {
    script += `-- =====================================================
-- ADICIONANDO COLUNAS FALTANTES
-- =====================================================

`;

    for (const issue of columnIssues) {
      script += `-- Colunas faltantes na tabela: ${issue.table}\n`;
      for (const column of issue.missingColumns) {
        // Aqui você precisaria definir o tipo de dados para cada coluna
        // Por simplicidade, vou usar TEXT como padrão
        script += `ALTER TABLE ${issue.table} ADD COLUMN IF NOT EXISTS ${column} TEXT;\n`;
      }
      script += '\n';
    }
  }

  script += `-- =====================================================
-- SCRIPT DE CORREÇÃO CONCLUÍDO
-- =====================================================
`;

  // Salvar script
  const scriptPath = '/www/wwwroot/CDNProxy/database_correction.sql';
  fs.writeFileSync(scriptPath, script);
  
  console.log(`✅ Script de correção salvo em: ${scriptPath}`);
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Revise o script database_correction.sql');
  console.log('2. Execute o script no SQL Editor do Supabase');
  console.log('3. Execute este verificador novamente para confirmar');
}

// Executar verificação
console.log('🚀 Iniciando verificação da estrutura do banco de dados...\n');
checkDatabaseStructure().then(() => {
  console.log('\n✅ Verificação concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});