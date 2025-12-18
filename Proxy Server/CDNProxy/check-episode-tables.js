const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura das tabelas...');
  
  try {
    // Verificar estrutura domain_analytics
    console.log('\n📊 DOMAIN_ANALYTICS:');
    const { data: domainData, error: domainError } = await supabase
      .from('domain_analytics')
      .select('*')
      .limit(1);
    
    if (!domainError && domainData && domainData.length > 0) {
      console.log('Campos encontrados:', Object.keys(domainData[0]).join(', '));
    } else {
      console.log('Tabela vazia ou erro:', domainError?.message || 'sem dados');
    }
    
    // Verificar estrutura streaming_metrics
    console.log('\n📊 STREAMING_METRICS:');
    const { data: streamingData, error: streamingError } = await supabase
      .from('streaming_metrics')
      .select('*')
      .limit(1);
    
    if (!streamingError && streamingData && streamingData.length > 0) {
      console.log('Campos encontrados:', Object.keys(streamingData[0]).join(', '));
    } else {
      console.log('Tabela vazia ou erro:', streamingError?.message || 'sem dados');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkTableStructure();