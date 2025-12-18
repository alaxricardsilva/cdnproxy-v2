const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🔧 Configuração do Supabase:');
console.log('  - URL:', supabaseUrl ? 'Configurada' : '❌ Não configurada');
console.log('  - Key:', supabaseKey ? 'Configurada' : '❌ Não configurada');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Configuração do Supabase incompleta');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('\n🔍 Verificando tabelas do Supabase...\n');
  
  // Verificar access_logs
  try {
    const { data: accessLogs, error: accessError, count: accessCount } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact' })
      .limit(5);
      
    console.log('📊 Tabela access_logs:');
    console.log('  - Erro:', accessError?.message || 'Nenhum');
    console.log('  - Total de registros:', accessCount || 0);
    console.log('  - Primeiros 5 registros:', accessLogs?.length || 0);
    
    if (accessLogs && accessLogs.length > 0) {
      console.log('  - Exemplo:', JSON.stringify(accessLogs[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao verificar access_logs:', error.message);
  }
  
  console.log('');
  
  // Verificar analytics_data
  try {
    const { data: analyticsData, error: analyticsError, count: analyticsCount } = await supabase
      .from('analytics_data')
      .select('*', { count: 'exact' })
      .limit(5);
      
    console.log('📈 Tabela analytics_data:');
    console.log('  - Erro:', analyticsError?.message || 'Nenhum');
    console.log('  - Total de registros:', analyticsCount || 0);
    console.log('  - Primeiros 5 registros:', analyticsData?.length || 0);
    
    if (analyticsData && analyticsData.length > 0) {
      console.log('  - Exemplo:', JSON.stringify(analyticsData[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao verificar analytics_data:', error.message);
  }
  
  console.log('');
  
  // Verificar domains
  try {
    const { data: domains, error: domainsError, count: domainsCount } = await supabase
      .from('domains')
      .select('*', { count: 'exact' })
      .limit(3);
      
    console.log('🌐 Tabela domains:');
    console.log('  - Erro:', domainsError?.message || 'Nenhum');
    console.log('  - Total de registros:', domainsCount || 0);
    console.log('  - Primeiros 3 registros:', domains?.length || 0);
    
    if (domains && domains.length > 0) {
      console.log('  - Exemplo:', JSON.stringify(domains[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao verificar domains:', error.message);
  }
  
  console.log('');
  
  // Verificar users
  try {
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(3);
      
    console.log('👥 Tabela users:');
    console.log('  - Erro:', usersError?.message || 'Nenhum');
    console.log('  - Total de registros:', usersCount || 0);
    console.log('  - Primeiros 3 registros:', users?.length || 0);
    
    if (users && users.length > 0) {
      console.log('  - Exemplo:', JSON.stringify(users[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao verificar users:', error.message);
  }
  
  console.log('');
  
  // Verificar hls_metrics
  try {
    const { data: hlsMetrics, error: hlsError, count: hlsCount } = await supabase
      .from('hls_metrics')
      .select('*', { count: 'exact' })
      .limit(3);
      
    console.log('📺 Tabela hls_metrics:');
    console.log('  - Erro:', hlsError?.message || 'Nenhum');
    console.log('  - Total de registros:', hlsCount || 0);
    console.log('  - Primeiros 3 registros:', hlsMetrics?.length || 0);
    
    if (hlsMetrics && hlsMetrics.length > 0) {
      console.log('  - Exemplo:', JSON.stringify(hlsMetrics[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao verificar hls_metrics:', error.message);
  }
  
  console.log('');
  
  // Verificar streaming_metrics
  try {
    const { data: streamingMetrics, error: streamingError, count: streamingCount } = await supabase
      .from('streaming_metrics')
      .select('*', { count: 'exact' })
      .limit(3);
      
    console.log('🎬 Tabela streaming_metrics:');
    console.log('  - Erro:', streamingError?.message || 'Nenhum');
    console.log('  - Total de registros:', streamingCount || 0);
    console.log('  - Primeiros 3 registros:', streamingMetrics?.length || 0);
    
    if (streamingMetrics && streamingMetrics.length > 0) {
      console.log('  - Exemplo:', JSON.stringify(streamingMetrics[0], null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao verificar streaming_metrics:', error.message);
  }
  
  console.log('\n✅ Verificação concluída!');
}

checkTables().catch(console.error);