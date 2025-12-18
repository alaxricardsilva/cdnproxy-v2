const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MzMyMzksImV4cCI6MjA3NDAwOTIzOX0.B9i9S1n9TxkeM3BHtuq1ZWs_25bugb92YkliWmCS7ok'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSystemMetrics() {
  console.log('🔍 Testando consultas das tabelas servers e system_metrics...')

  try {
    // Testar tabela servers
    console.log('\n📊 Testando tabela servers...')
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, status')
      .eq('status', 'active')

    if (serversError) {
      console.error('❌ Erro na consulta servers:', serversError)
    } else {
      console.log('✅ Consulta servers bem-sucedida:', { count: servers?.length || 0, data: servers })
    }

    // Testar tabela system_metrics
    console.log('\n📊 Testando tabela system_metrics...')
    const { data: metrics, error: metricsError } = await supabase
      .from('system_metrics')
      .select('cpu_usage, memory_usage, created_at')
      .order('created_at', { ascending: false })
      .limit(1)

    if (metricsError) {
      console.error('❌ Erro na consulta system_metrics:', metricsError)
    } else {
      console.log('✅ Consulta system_metrics bem-sucedida:', { count: metrics?.length || 0, data: metrics })
    }

    // Testar todas as outras tabelas do endpoint stats
    console.log('\n📊 Testando outras tabelas...')
    
    const [
      usersResult,
      domainsResult,
      transactionsResult,
      plansResult
    ] = await Promise.all([
      supabase.from('users').select('id, role, created_at', { count: 'exact' }),
      supabase.from('domains').select('id, active, created_at', { count: 'exact' }),
      supabase.from('transactions').select('id, status, amount, created_at', { count: 'exact' }),
      supabase.from('plans').select('id, active', { count: 'exact' })
    ])

    console.log('Users:', { error: usersResult.error, count: usersResult.count })
    console.log('Domains:', { error: domainsResult.error, count: domainsResult.count })
    console.log('Transactions:', { error: transactionsResult.error, count: transactionsResult.count })
    console.log('Plans:', { error: plansResult.error, count: plansResult.count })

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

testSystemMetrics()