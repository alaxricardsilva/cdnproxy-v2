const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPlans() {
  try {
    console.log('🔍 Verificando planos existentes no banco...');
    
    // Buscar planos existentes
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('❌ Erro ao buscar planos:', error);
      return;
    }
    
    if (!plans || plans.length === 0) {
      console.log('📭 Nenhum plano encontrado no banco');
      return;
    }
    
    console.log(`✅ Encontrados ${plans.length} planos:`);
    plans.forEach((plan, index) => {
      console.log(`   ${index + 1}. ID: ${plan.id} | Nome: ${plan.name} | Preço: R$ ${plan.price} | Status: ${plan.status || 'N/A'}`);
    });
    
    // Pegar o primeiro plano para usar no teste
    const firstPlan = plans[0];
    console.log(`\n🎯 Usando plano para teste: ${firstPlan.name} (ID: ${firstPlan.id})`);
    
    return firstPlan;
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkPlans();