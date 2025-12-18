const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSystemTables() {
  console.log('🔧 Executando SQL para criar tabelas de sistema...')

  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'create-system-tables.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0)

    console.log(`📝 Executando ${commands.length} comandos SQL...`)

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      if (command.trim()) {
        console.log(`⚡ Executando comando ${i + 1}/${commands.length}...`)
        
        try {
          // Para comandos CREATE TABLE, INSERT, etc., usar query direta
          const { error } = await supabase
            .from('_temp_')
            .select('1')
            .limit(0)
          
          // Como não podemos executar SQL arbitrário via client, vamos tentar criar as tabelas individualmente
          if (command.includes('CREATE TABLE IF NOT EXISTS system_metrics')) {
            console.log('📊 Verificando se tabela system_metrics existe...')
            const { data, error } = await supabase
              .from('system_metrics')
              .select('id')
              .limit(1)
            
            if (error && error.code === 'PGRST204') {
              console.log('❌ Tabela system_metrics não existe. Precisa ser criada manualmente no Supabase.')
            } else {
              console.log('✅ Tabela system_metrics já existe')
            }
          }
          
          if (command.includes('CREATE TABLE IF NOT EXISTS system_alerts')) {
            console.log('🚨 Verificando se tabela system_alerts existe...')
            const { data, error } = await supabase
              .from('system_alerts')
              .select('id')
              .limit(1)
            
            if (error && error.code === 'PGRST204') {
              console.log('❌ Tabela system_alerts não existe. Precisa ser criada manualmente no Supabase.')
            } else {
              console.log('✅ Tabela system_alerts já existe')
            }
          }
          
          if (command.includes('CREATE TABLE IF NOT EXISTS servers')) {
            console.log('🖥️ Verificando se tabela servers existe...')
            const { data, error } = await supabase
              .from('servers')
              .select('id')
              .limit(1)
            
            if (error && error.code === 'PGRST204') {
              console.log('❌ Tabela servers não existe. Precisa ser criada manualmente no Supabase.')
            } else {
              console.log('✅ Tabela servers já existe')
            }
          }
          
        } catch (cmdError) {
          console.error(`❌ Erro no comando ${i + 1}:`, cmdError.message)
        }
      }
    }

    // Tentar inserir dados de teste se as tabelas existirem
    console.log('📝 Tentando inserir dados de teste...')
    
    try {
      const { error: serverError } = await supabase
        .from('servers')
        .upsert({
          name: 'Servidor Principal',
          hostname: 'localhost',
          ip_address: '127.0.0.1',
          status: 'active',
          server_type: 'web',
          location: 'Local',
          specs: {
            cpu_cores: 4,
            memory_gb: 8,
            disk_gb: 100
          }
        }, { onConflict: 'hostname' })

      if (serverError) {
        console.log('❌ Erro ao inserir servidor (tabela pode não existir):', serverError.message)
      } else {
        console.log('✅ Servidor inserido com sucesso')
      }
    } catch (e) {
      console.log('❌ Tabela servers não existe')
    }

    try {
      const { error: metricError } = await supabase
        .from('system_metrics')
        .insert({
          cpu_usage: 25.0,
          memory_usage: 60.0,
          disk_usage: 45.0,
          load_average: 1.2
        })

      if (metricError) {
        console.log('❌ Erro ao inserir métrica (tabela pode não existir):', metricError.message)
      } else {
        console.log('✅ Métrica inserida com sucesso')
      }
    } catch (e) {
      console.log('❌ Tabela system_metrics não existe')
    }

    console.log('🎉 Processo concluído!')
    console.log('📋 INSTRUÇÕES:')
    console.log('1. Acesse o painel do Supabase')
    console.log('2. Vá para SQL Editor')
    console.log('3. Execute o conteúdo do arquivo create-system-tables.sql')
    console.log('4. Isso criará as tabelas necessárias para métricas do sistema')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
executeSystemTables()