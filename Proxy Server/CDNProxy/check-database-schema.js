const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabaseSchema() {
  console.log('🔍 Verificando schema do banco de dados...')

  try {
    // 1. Verificar tabela access_logs
    console.log('\n📊 Verificando access_logs...')
    const { data: accessLogs, error: accessError } = await supabase
      .from('access_logs')
      .select('*')
      .limit(1)

    if (accessError) {
      console.log('❌ Erro ao acessar access_logs:', accessError.message)
    } else {
      console.log('✅ Tabela access_logs acessível')
      if (accessLogs && accessLogs.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(accessLogs[0]))
        
        // Verificar colunas específicas necessárias
        const requiredColumns = [
          'bytes_transferred', 'bytes_sent', 'response_time_ms', 
          'client_ip', 'real_ip', 'user_agent', 'country', 'domain_id'
        ]
        
        const availableColumns = Object.keys(accessLogs[0])
        const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col))
        
        if (missingColumns.length > 0) {
          console.log('⚠️ Colunas em falta:', missingColumns)
        } else {
          console.log('✅ Todas as colunas necessárias estão presentes')
        }
      } else {
        console.log('📋 Tabela vazia - inserindo dados de teste...')
        
        // Inserir dados de teste
        const { error: insertError } = await supabase
          .from('access_logs')
          .insert({
            domain_id: 'test-domain',
            domain: 'test.example.com',
            path: '/test',
            method: 'GET',
            status_code: 200,
            response_time_ms: 150,
            bytes_transferred: 1024,
            bytes_sent: 1024,
            client_ip: '192.168.1.1',
            real_ip: '192.168.1.1',
            user_agent: 'Mozilla/5.0 Test Browser',
            country: 'BR',
            referer: null
          })

        if (insertError) {
          console.log('❌ Erro ao inserir dados de teste:', insertError.message)
          console.log('📋 Detalhes do erro:', insertError)
        } else {
          console.log('✅ Dados de teste inseridos com sucesso')
        }
      }
    }

    // 2. Verificar tabela analytics_data
    console.log('\n📈 Verificando analytics_data...')
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics_data')
      .select('*')
      .limit(1)

    if (analyticsError) {
      console.log('❌ Erro ao acessar analytics_data:', analyticsError.message)
    } else {
      console.log('✅ Tabela analytics_data acessível')
      if (analyticsData && analyticsData.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(analyticsData[0]))
        
        // Verificar colunas específicas necessárias
        const requiredColumns = [
          'domain_id', 'date', 'total_requests', 'unique_visitors', 
          'total_bandwidth', 'bytes_transferred', 'response_time_ms'
        ]
        
        const availableColumns = Object.keys(analyticsData[0])
        const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col))
        
        if (missingColumns.length > 0) {
          console.log('⚠️ Colunas em falta:', missingColumns)
        } else {
          console.log('✅ Todas as colunas necessárias estão presentes')
        }
      } else {
        console.log('📋 Tabela vazia')
      }
    }

    // 3. Verificar tabela hls_metrics
    console.log('\n🎥 Verificando hls_metrics...')
    const { data: hlsMetrics, error: hlsError } = await supabase
      .from('hls_metrics')
      .select('*')
      .limit(1)

    if (hlsError) {
      console.log('❌ Erro ao acessar hls_metrics:', hlsError.message)
    } else {
      console.log('✅ Tabela hls_metrics acessível')
      if (hlsMetrics && hlsMetrics.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(hlsMetrics[0]))
      } else {
        console.log('📋 Tabela vazia')
      }
    }

    // 4. Verificar tabela streaming_sessions
    console.log('\n📺 Verificando streaming_sessions...')
    const { data: streamingSessions, error: streamingError } = await supabase
      .from('streaming_sessions')
      .select('*')
      .limit(1)

    if (streamingError) {
      console.log('❌ Erro ao acessar streaming_sessions:', streamingError.message)
    } else {
      console.log('✅ Tabela streaming_sessions acessível')
      if (streamingSessions && streamingSessions.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(streamingSessions[0]))
      } else {
        console.log('📋 Tabela vazia')
      }
    }

    // 5. Contar registros em todas as tabelas
    console.log('\n📊 Contando registros...')
    
    const tables = ['access_logs', 'analytics_data', 'hls_metrics', 'streaming_sessions', 'system_metrics', 'servers']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`❌ ${table}: Erro - ${error.message}`)
        } else {
          console.log(`📊 ${table}: ${count || 0} registros`)
        }
      } catch (e) {
        console.log(`❌ ${table}: Erro ao contar - ${e.message}`)
      }
    }

    console.log('\n🎉 Verificação de schema concluída!')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
checkDatabaseSchema()