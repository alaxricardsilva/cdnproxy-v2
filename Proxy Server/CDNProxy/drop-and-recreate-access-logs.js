const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './backend/.env.production' })

async function dropAndRecreateAccessLogs() {
  console.log('🔧 Removendo e recriando tabela access_logs...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não encontradas')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    console.log('🗑️ Removendo tabela access_logs existente...')
    
    // Remover a tabela existente
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS access_logs CASCADE;'
    })
    
    if (dropError && dropError.code !== 'PGRST202') {
      console.error('❌ Erro ao remover tabela:', dropError)
      console.log('⚠️ Continuando mesmo assim...')
    } else {
      console.log('✅ Tabela removida (ou não existia)')
    }
    
    console.log('🏗️ Criando nova tabela access_logs...')
    
    // Criar a nova tabela com a estrutura correta
    const createTableSQL = `
      CREATE TABLE access_logs (
        id BIGSERIAL PRIMARY KEY,
        domain TEXT NOT NULL,
        path TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        client_ip INET NOT NULL,
        user_agent TEXT,
        device_type TEXT,
        access_timestamp TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX idx_access_logs_ip ON access_logs(client_ip);
      CREATE INDEX idx_access_logs_domain ON access_logs(domain);
      CREATE INDEX idx_access_logs_timestamp ON access_logs(access_timestamp);
    `
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    })
    
    if (createError && createError.code !== 'PGRST202') {
      console.error('❌ Erro ao criar tabela:', createError)
      console.log('⚠️ Tentando método alternativo...')
      
      // Método alternativo: usar inserção direta
      const { error: altError } = await supabase
        .from('access_logs')
        .select('*')
        .limit(1)
      
      if (altError) {
        console.error('❌ Tabela ainda não existe:', altError)
        console.log('📝 Execute manualmente no Editor SQL do Supabase:')
        console.log(createTableSQL)
        return
      }
    }
    
    console.log('✅ Tabela access_logs criada com sucesso!')
    
    // Testar a nova estrutura
    console.log('🧪 Testando nova estrutura...')
    
    const testRecord = {
      domain: 'test.example.com',
      path: '/test',
      method: 'GET',
      status_code: 200,
      client_ip: '192.168.1.1',
      user_agent: 'Test Agent',
      device_type: 'desktop',
      access_timestamp: new Date().toISOString()
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('access_logs')
      .insert(testRecord)
      .select()
    
    if (insertError) {
      console.error('❌ Erro ao inserir registro de teste:', insertError)
      return
    }
    
    console.log('✅ Teste de inserção bem-sucedido!')
    console.log('📝 Dados inseridos:', insertData)
    
    // Limpar o registro de teste
    if (insertData && insertData.length > 0) {
      const { error: deleteError } = await supabase
        .from('access_logs')
        .delete()
        .eq('id', insertData[0].id)
      
      if (!deleteError) {
        console.log('🧹 Registro de teste removido')
      }
    }
    
    console.log('🎉 Tabela access_logs está pronta para uso!')
    
  } catch (err) {
    console.error('❌ Erro geral:', err)
  }
}

dropAndRecreateAccessLogs()