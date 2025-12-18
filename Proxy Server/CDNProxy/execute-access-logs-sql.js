const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAccessLogsTable() {
  console.log('🔧 Criando tabela access_logs no Supabase...\n');

  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('./create-access-logs-table.sql', 'utf8');
    
    // Executar o SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.error('❌ Erro ao executar SQL:', error);
      
      // Tentar criar a tabela diretamente
      console.log('🔄 Tentando criar a tabela diretamente...');
      
      const { data: createData, error: createError } = await supabase
        .from('access_logs')
        .select('*')
        .limit(1);

      if (createError && createError.code === 'PGRST116') {
        console.log('❌ Tabela access_logs não existe. Precisa ser criada manualmente no Supabase.');
        console.log('\n📋 Execute este SQL no Supabase SQL Editor:');
        console.log(sqlContent);
      } else if (createError) {
        console.error('❌ Erro ao verificar tabela:', createError);
      } else {
        console.log('✅ Tabela access_logs já existe e está acessível');
      }
    } else {
      console.log('✅ SQL executado com sucesso!');
      console.log('Resultado:', data);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    
    // Mostrar o SQL para execução manual
    try {
      const sqlContent = fs.readFileSync('./create-access-logs-table.sql', 'utf8');
      console.log('\n📋 Execute este SQL manualmente no Supabase SQL Editor:');
      console.log(sqlContent);
    } catch (readError) {
      console.error('❌ Erro ao ler arquivo SQL:', readError.message);
    }
  }
}

createAccessLogsTable();