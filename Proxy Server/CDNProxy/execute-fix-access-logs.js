const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAccessLogsTable() {
  try {
    console.log('🔧 Iniciando correção da tabela access_logs...');
    
    // 1. Alterar o campo country para VARCHAR(100)
    console.log('📝 Alterando campo country para VARCHAR(100)...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE access_logs ALTER COLUMN country TYPE VARCHAR(100);'
    });
    
    if (alterError && !alterError.message.includes('already exists')) {
      console.error('❌ Erro ao alterar campo country:', alterError);
    } else {
      console.log('✅ Campo country alterado com sucesso!');
    }
    
    // 2. Adicionar campos faltantes
    const fieldsToAdd = [
      { name: 'status_code', type: 'INTEGER', description: 'Código de status HTTP' },
      { name: 'device_type', type: 'VARCHAR(50)', description: 'Tipo de dispositivo' },
      { name: 'city', type: 'VARCHAR(100)', description: 'Cidade do usuário' },
      { name: 'referer', type: 'TEXT', description: 'URL de referência' },
      { name: 'access_timestamp', type: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()', description: 'Timestamp de acesso' }
    ];
    
    for (const field of fieldsToAdd) {
      console.log(`📝 Adicionando campo ${field.name} (${field.description})...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS ${field.name} ${field.type};`
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Erro ao adicionar campo ${field.name}:`, error);
      } else {
        console.log(`✅ Campo ${field.name} adicionado/verificado com sucesso!`);
      }
    }
    
    // 3. Renomear campo status para status_code se existir
    console.log('📝 Verificando se precisa renomear campo status...');
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'access_logs' AND column_name = 'status';`
    });
    
    if (!columnsError && columns && columns.length > 0) {
      console.log('📝 Renomeando campo status para status_code...');
      const { error: renameError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE access_logs RENAME COLUMN status TO status_code;'
      });
      
      if (renameError) {
        console.error('❌ Erro ao renomear campo status:', renameError);
      } else {
        console.log('✅ Campo status renomeado para status_code!');
      }
    }
    
    // 4. Criar índices para melhor performance
    console.log('📝 Criando índices para melhor performance...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_access_logs_domain ON access_logs(domain);',
      'CREATE INDEX IF NOT EXISTS idx_access_logs_domain_id ON access_logs(domain_id);',
      'CREATE INDEX IF NOT EXISTS idx_access_logs_client_ip ON access_logs(client_ip);',
      'CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_access_logs_country ON access_logs(country);',
      'CREATE INDEX IF NOT EXISTS idx_access_logs_device_type ON access_logs(device_type);'
    ];
    
    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (error) {
        console.error('❌ Erro ao criar índice:', error);
      }
    }
    console.log('✅ Índices criados/verificados com sucesso!');
    
    // 5. Verificar estrutura final da tabela
    console.log('📊 Verificando estrutura final da tabela access_logs...');
    const { data: finalStructure, error: structureError } = await supabase.rpc('exec_sql', {
      sql: `SELECT column_name, data_type, character_maximum_length, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'access_logs' 
            ORDER BY ordinal_position;`
    });
    
    if (structureError) {
      console.error('❌ Erro ao verificar estrutura:', structureError);
    } else {
      console.log('📋 Estrutura atual da tabela access_logs:');
      console.table(finalStructure);
    }
    
    console.log('🎉 Correção da tabela access_logs concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
fixAccessLogsTable();