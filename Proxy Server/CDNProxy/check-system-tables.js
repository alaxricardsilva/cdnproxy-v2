const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSystemTables() {
  console.log('🔍 Verificando estrutura das tabelas de sistema...')

  try {
    // 1. Verificar tabela system_metrics
    console.log('\n📊 Verificando system_metrics...')
    const { data: metrics, error: metricsError } = await supabase
      .from('system_metrics')
      .select('*')
      .limit(1)

    if (metricsError) {
      console.log('❌ Erro ao acessar system_metrics:', metricsError.message)
    } else {
      console.log('✅ Tabela system_metrics acessível')
      if (metrics && metrics.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(metrics[0]))
        console.log('📊 Exemplo de dados:', metrics[0])
      } else {
        console.log('📋 Tabela vazia')
      }
    }

    // 2. Verificar tabela system_alerts
    console.log('\n🚨 Verificando system_alerts...')
    const { data: alerts, error: alertsError } = await supabase
      .from('system_alerts')
      .select('*')
      .limit(1)

    if (alertsError) {
      console.log('❌ Erro ao acessar system_alerts:', alertsError.message)
    } else {
      console.log('✅ Tabela system_alerts acessível')
      if (alerts && alerts.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(alerts[0]))
        console.log('🚨 Exemplo de dados:', alerts[0])
      } else {
        console.log('📋 Tabela vazia')
      }
    }

    // 3. Verificar tabela servers
    console.log('\n🖥️ Verificando servers...')
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('*')
      .limit(1)

    if (serversError) {
      console.log('❌ Erro ao acessar servers:', serversError.message)
    } else {
      console.log('✅ Tabela servers acessível')
      if (servers && servers.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(servers[0]))
        console.log('🖥️ Exemplo de dados:', servers[0])
      } else {
        console.log('📋 Tabela vazia')
      }
    }

    // 4. Contar registros
    console.log('\n📊 Contando registros...')
    
    const { count: metricsCount } = await supabase
      .from('system_metrics')
      .select('*', { count: 'exact', head: true })
    
    const { count: alertsCount } = await supabase
      .from('system_alerts')
      .select('*', { count: 'exact', head: true })
    
    const { count: serversCount } = await supabase
      .from('servers')
      .select('*', { count: 'exact', head: true })

    console.log(`📊 system_metrics: ${metricsCount || 0} registros`)
    console.log(`🚨 system_alerts: ${alertsCount || 0} registros`)
    console.log(`🖥️ servers: ${serversCount || 0} registros`)

    // 5. Inserir dados de teste se necessário
    if (serversCount === 0) {
      console.log('\n📝 Inserindo servidor de teste...')
      const { error: insertError } = await supabase
        .from('servers')
        .insert({
          name: 'Servidor Principal',
          hostname: 'localhost',
          ip_address: '127.0.0.1',
          status: 'active',
          location: 'Local'
        })

      if (insertError) {
        console.log('❌ Erro ao inserir servidor:', insertError.message)
      } else {
        console.log('✅ Servidor inserido com sucesso')
      }
    }

    if (metricsCount === 0) {
      console.log('\n📝 Inserindo métrica de teste...')
      const { error: insertError } = await supabase
        .from('system_metrics')
        .insert({
          cpu_usage: 25.0,
          memory_usage: 60.0,
          disk_usage: 45.0,
          load_average: 1.2
        })

      if (insertError) {
        console.log('❌ Erro ao inserir métrica:', insertError.message)
      } else {
        console.log('✅ Métrica inserida com sucesso')
      }
    }

    console.log('\n🎉 Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
checkSystemTables()