const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Verificando tabelas no Supabase...\n');

  try {
    // Verificar tabela access_logs
    console.log('📋 Verificando tabela access_logs...');
    const { data: accessLogsData, error: accessLogsError } = await supabase
      .from('access_logs')
      .select('*')
      .limit(1);

    if (accessLogsError) {
      console.log('❌ Tabela access_logs não existe ou não é acessível');
      console.log('Erro:', accessLogsError.message);
    } else {
      console.log('✅ Tabela access_logs existe e é acessível');
      console.log(`   Estrutura verificada com sucesso`);
    }

    // Verificar tabela ip_geo_cache
    console.log('\n📋 Verificando tabela ip_geo_cache...');
    const { data: ipGeoCacheData, error: ipGeoCacheError } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .limit(1);

    if (ipGeoCacheError) {
      console.log('❌ Tabela ip_geo_cache não existe ou não é acessível');
      console.log('Erro:', ipGeoCacheError.message);
    } else {
      console.log('✅ Tabela ip_geo_cache existe e é acessível');
      console.log(`   Registros encontrados: ${ipGeoCacheData?.length || 0}`);
    }

    // Verificar se existe tabela geolocation_cache (antiga)
    console.log('\n📋 Verificando tabela geolocation_cache (antiga)...');
    const { data: geoLocationCacheData, error: geoLocationCacheError } = await supabase
      .from('geolocation_cache')
      .select('*')
      .limit(1);

    if (geoLocationCacheError) {
      console.log('❌ Tabela geolocation_cache não existe (isso é esperado)');
    } else {
      console.log('⚠️  Tabela geolocation_cache ainda existe');
      console.log(`   Registros encontrados: ${geoLocationCacheData?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  }
}

checkTables();