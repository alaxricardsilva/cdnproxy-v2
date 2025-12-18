const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Credenciais do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersTable() {
  try {
    console.log('🔍 Verificando estrutura da tabela users...\n');
    
    // Buscar um usuário para ver as colunas disponíveis
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao consultar tabela users:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 Colunas encontradas na tabela users:');
      columns.forEach(col => console.log(`     • ${col}`));
      
      console.log('\n🔍 Verificando se a coluna "observations" existe:');
      if (columns.includes('observations')) {
        console.log('✅ A coluna "observations" EXISTE na tabela users');
      } else {
        console.log('❌ A coluna "observations" NÃO EXISTE na tabela users');
      }
    } else {
      console.log('⚠️  Tabela users está vazia, não é possível verificar as colunas');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkUsersTable();