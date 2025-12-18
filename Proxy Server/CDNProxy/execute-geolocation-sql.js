const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL() {
  try {
    console.log('🔧 [GEOLOCATION] Iniciando criação da tabela geolocation_cache...');

    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync(path.join(__dirname, 'create-geolocation-cache-table.sql'), 'utf8');
    
    // Dividir o SQL em comandos individuais (separados por ponto e vírgula)
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 [GEOLOCATION] Executando ${sqlCommands.length} comandos SQL...`);

    // Executar cada comando SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      if (command.includes('SELECT') && command.includes('information_schema')) {
        // Pular comandos de verificação no final
        console.log(`⏭️  [GEOLOCATION] Pulando comando de verificação: ${command.substring(0, 50)}...`);
        continue;
      }

      try {
        console.log(`⚡ [GEOLOCATION] Executando comando ${i + 1}/${sqlCommands.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: command
        });

        if (error) {
          console.error(`❌ [GEOLOCATION] Erro no comando ${i + 1}:`, error);
          // Continuar com os próximos comandos mesmo se houver erro
        } else {
          console.log(`✅ [GEOLOCATION] Comando ${i + 1} executado com sucesso`);
        }
      } catch (cmdError) {
        console.error(`❌ [GEOLOCATION] Erro ao executar comando ${i + 1}:`, cmdError.message);
      }
    }

    // Verificar se a tabela foi criada
    console.log('🔍 [GEOLOCATION] Verificando se a tabela foi criada...');
    
    const { data: tableCheck, error: checkError } = await supabase
      .from('geolocation_cache')
      .select('count(*)')
      .limit(1);

    if (checkError) {
      console.error('❌ [GEOLOCATION] Erro ao verificar tabela:', checkError);
      
      // Tentar criar a tabela diretamente
      console.log('🔧 [GEOLOCATION] Tentando criar tabela diretamente...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS geolocation_cache (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ip INET NOT NULL UNIQUE,
          country VARCHAR(100),
          city VARCHAR(100),
          region VARCHAR(100),
          country_code VARCHAR(2),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          timezone VARCHAR(50),
          isp VARCHAR(255),
          org VARCHAR(255),
          as_number VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableSQL
      });

      if (createError) {
        console.error('❌ [GEOLOCATION] Erro ao criar tabela diretamente:', createError);
      } else {
        console.log('✅ [GEOLOCATION] Tabela criada diretamente com sucesso!');
      }
    } else {
      console.log('✅ [GEOLOCATION] Tabela geolocation_cache verificada com sucesso!');
    }

    // Testar inserção de dados
    console.log('🧪 [GEOLOCATION] Testando inserção de dados...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('geolocation_cache')
      .upsert({
        ip: '8.8.8.8',
        country: 'United States',
        city: 'Mountain View',
        region: 'California',
        country_code: 'US',
        latitude: 37.4056,
        longitude: -122.0775,
        timezone: 'America/Los_Angeles',
        isp: 'Google LLC',
        org: 'Google LLC',
        as_number: 'AS15169'
      })
      .select();

    if (insertError) {
      console.error('❌ [GEOLOCATION] Erro ao inserir dados de teste:', insertError);
    } else {
      console.log('✅ [GEOLOCATION] Dados de teste inseridos com sucesso:', insertData);
    }

    console.log('🎉 [GEOLOCATION] Processo concluído!');

  } catch (error) {
    console.error('💥 [GEOLOCATION] Erro geral:', error);
  }
}

// Executar o script
executeSQL();