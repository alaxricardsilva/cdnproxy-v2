const axios = require('axios')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const BASE_URL = 'https://api.cdnproxy.top'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function testEndpointDirect(url, description) {
  try {
    console.log(`\n🔍 Testando: ${description}`)
    console.log(`📍 URL: ${url}`)
    
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500; // Aceitar qualquer status < 500
      }
    })

    console.log(`📊 Status: ${response.status}`)
    
    if (response.status === 200 && response.data) {
      // Verificar se há dados reais
      const data = response.data.data || response.data
      let hasRealData = false
      let dataInfo = ''

      if (data) {
        // Verificar diferentes tipos de dados
        if (data.metrics) {
          const metrics = data.metrics
          hasRealData = metrics.pageViews > 0 || metrics.uniqueUsers > 0
          dataInfo = `Métricas: ${metrics.pageViews || 0} pageViews, ${metrics.uniqueUsers || 0} usuários únicos`
        }
        
        if (data.totalVisits !== undefined) {
          hasRealData = data.totalVisits > 0 || data.uniqueVisitors > 0
          dataInfo = `Visitas: ${data.totalVisits || 0}, Visitantes únicos: ${data.uniqueVisitors || 0}`
        }
        
        if (data.totalRequests !== undefined) {
          hasRealData = data.totalRequests > 0
          dataInfo = `Requests: ${data.totalRequests || 0}, Visitantes: ${data.uniqueVisitors || 0}`
        }

        // Verificar dados de sistema
        if (data.cpu !== undefined || data.memory !== undefined) {
          hasRealData = true
          dataInfo = `Sistema: CPU ${data.cpu || 0}%, Memory ${data.memory || 0}%`
        }

        // Verificar arrays de dados
        if (data.chartData && data.chartData.visits) {
          const totalChartVisits = data.chartData.visits.reduce((sum, item) => sum + (item.visits || 0), 0)
          hasRealData = totalChartVisits > 0
          dataInfo += ` | Chart: ${totalChartVisits} visitas`
        }

        if (data.dataSource) {
          dataInfo += ` | Fonte: ${data.dataSource.analyticsRecords || 0} analytics, ${data.dataSource.accessLogsRecords || 0} logs`
        }
      }

      console.log(`📊 Dados: ${hasRealData ? '✅ REAIS' : '⚠️ VAZIOS/SIMULADOS'}`)
      if (dataInfo) {
        console.log(`📋 Info: ${dataInfo}`)
      }
      
      return { success: true, hasRealData, status: response.status }
    } else if (response.status === 401) {
      console.log(`🔐 Requer autenticação (esperado)`)
      return { success: true, hasRealData: false, status: response.status, requiresAuth: true }
    } else {
      console.log(`⚠️ Status: ${response.status} - ${response.data?.statusMessage || 'Erro desconhecido'}`)
      return { success: false, hasRealData: false, status: response.status }
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log(`🔐 Requer autenticação (esperado)`)
      return { success: true, hasRealData: false, status: 401, requiresAuth: true }
    }
    
    console.log(`❌ Erro: ${error.response?.status || 'Network'} - ${error.response?.data?.statusMessage || error.message}`)
    return { success: false, hasRealData: false, status: error.response?.status || 0 }
  }
}

async function testDatabaseData() {
  console.log('\n🗄️ VERIFICANDO DADOS NO BANCO DE DADOS')
  console.log('=' .repeat(50))
  
  try {
    // Verificar access_logs
    const { data: accessLogs, error: accessError } = await supabase
      .from('access_logs')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false })

    if (accessError) {
      console.log('❌ Erro ao acessar access_logs:', accessError.message)
    } else {
      console.log(`📊 Access Logs: ${accessLogs.length} registros recentes encontrados`)
      if (accessLogs.length > 0) {
        const latest = accessLogs[0]
        console.log(`   Último: ${latest.domain || 'N/A'} - ${latest.bytes_transferred || 0} bytes - ${latest.created_at}`)
      }
    }

    // Verificar analytics_data
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics_data')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false })

    if (analyticsError) {
      console.log('❌ Erro ao acessar analytics_data:', analyticsError.message)
    } else {
      console.log(`📈 Analytics Data: ${analyticsData.length} registros recentes encontrados`)
      if (analyticsData.length > 0) {
        const latest = analyticsData[0]
        console.log(`   Último: ${latest.domain_id || 'N/A'} - ${latest.page_views || 0} views - ${latest.created_at}`)
      }
    }

    // Verificar domínios
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('id, domain, status')
      .limit(3)

    if (domainsError) {
      console.log('❌ Erro ao acessar domains:', domainsError.message)
    } else {
      console.log(`🌐 Domínios: ${domains.length} encontrados`)
      domains.forEach(domain => {
        console.log(`   - ${domain.domain} (ID: ${domain.id}) - Status: ${domain.status}`)
      })
    }

  } catch (error) {
    console.log('❌ Erro geral no banco:', error.message)
  }
}

async function testAnalyticsEndpoints() {
  console.log('🧪 TESTE SIMPLIFICADO DOS ENDPOINTS DE ANALYTICS')
  console.log('=' .repeat(60))

  // 1. Verificar dados no banco primeiro
  await testDatabaseData()

  // 2. Testar endpoints públicos/básicos
  console.log('\n📊 TESTANDO ENDPOINTS DE ANALYTICS')
  console.log('=' .repeat(40))

  const endpoints = [
    {
      url: `${BASE_URL}/api/analytics/metrics`,
      desc: 'Métricas Gerais'
    },
    {
      url: `${BASE_URL}/api/analytics/performance`,
      desc: 'Performance Analytics'
    },
    {
      url: `${BASE_URL}/api/analytics/traffic`,
      desc: 'Tráfego Analytics'
    },
    {
      url: `${BASE_URL}/api/superadmin/stats`,
      desc: 'Stats do Sistema (pode requerer auth)'
    },
    {
      url: `${BASE_URL}/api/superadmin/analytics`,
      desc: 'Analytics do Superadmin (pode requerer auth)'
    }
  ]

  let results = { 
    total: 0, 
    working: 0, 
    withRealData: 0, 
    requiresAuth: 0,
    errors: 0
  }

  for (const endpoint of endpoints) {
    results.total++
    const result = await testEndpointDirect(endpoint.url, endpoint.desc)
    
    if (result.success) {
      results.working++
      if (result.hasRealData) {
        results.withRealData++
      }
      if (result.requiresAuth) {
        results.requiresAuth++
      }
    } else {
      results.errors++
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)) // Aguardar entre requests
  }

  // 3. Testar endpoint específico de domínio (se houver domínios)
  try {
    const { data: domains } = await supabase
      .from('domains')
      .select('id, domain')
      .limit(1)

    if (domains && domains.length > 0) {
      const domain = domains[0]
      console.log(`\n🌐 TESTANDO ANALYTICS DE DOMÍNIO ESPECÍFICO`)
      console.log(`Domínio: ${domain.domain} (ID: ${domain.id})`)
      
      const domainEndpoints = [
        {
          url: `${BASE_URL}/api/admin/domains/${domain.id}/analytics`,
          desc: `Analytics do Domínio ${domain.domain}`
        },
        {
          url: `${BASE_URL}/api/admin/domains/${domain.id}/analytics?period=7`,
          desc: `Analytics 7 dias - ${domain.domain}`
        }
      ]

      for (const endpoint of domainEndpoints) {
        results.total++
        const result = await testEndpointDirect(endpoint.url, endpoint.desc)
        
        if (result.success) {
          results.working++
          if (result.hasRealData) {
            results.withRealData++
          }
          if (result.requiresAuth) {
            results.requiresAuth++
          }
        } else {
          results.errors++
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  } catch (error) {
    console.log('⚠️ Não foi possível testar endpoints de domínio:', error.message)
  }

  // 4. Relatório final
  console.log('\n📋 RELATÓRIO FINAL')
  console.log('=' .repeat(60))
  console.log(`📊 Total de endpoints testados: ${results.total}`)
  console.log(`✅ Endpoints funcionando: ${results.working}/${results.total} (${Math.round(results.working/results.total*100)}%)`)
  console.log(`🔐 Requerem autenticação: ${results.requiresAuth}`)
  console.log(`📈 Com dados reais: ${results.withRealData}`)
  console.log(`❌ Com erros: ${results.errors}`)
  
  if (results.working === results.total) {
    console.log(`\n🎉 EXCELENTE! Todos os endpoints estão respondendo corretamente!`)
  } else if (results.working > results.total * 0.7) {
    console.log(`\n✅ BOM! A maioria dos endpoints está funcionando.`)
  } else {
    console.log(`\n⚠️ ATENÇÃO! Muitos endpoints com problemas.`)
  }

  if (results.withRealData > 0) {
    console.log(`📊 DADOS REAIS DETECTADOS! Os analytics estão funcionando com dados do banco.`)
  } else {
    console.log(`⚠️ Nenhum endpoint retornou dados reais. Pode ser necessário mais tráfego ou configuração.`)
  }
}

// Executar testes
testAnalyticsEndpoints().catch(console.error)