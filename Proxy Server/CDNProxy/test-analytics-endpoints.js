const axios = require('axios')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const BASE_URL = 'https://api.cdnproxy.top'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Credenciais de teste
const SUPERADMIN_CREDENTIALS = {
  email: 'alaxricardsilva@gmail.com',
  password: 'Admin123'
}

const ADMIN_CREDENTIALS = {
  email: 'alaxricardsilva@outlook.com', 
  password: 'Admin123'
}

async function login(credentials, userType) {
  try {
    console.log(`🔐 Fazendo login como ${userType}...`)
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.data.success && response.data.token) {
      console.log(`✅ Login ${userType} realizado com sucesso`)
      return response.data.token
    } else {
      console.log(`❌ Falha no login ${userType}:`, response.data)
      return null
    }
  } catch (error) {
    console.log(`❌ Erro no login ${userType}:`, error.response?.data || error.message)
    return null
  }
}

async function testEndpoint(url, token, description) {
  try {
    console.log(`\n🔍 Testando: ${description}`)
    console.log(`📍 URL: ${url}`)
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    if (response.status === 200 && response.data) {
      console.log(`✅ Status: ${response.status}`)
      
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
        
        if (data.averageResponseTime !== undefined) {
          hasRealData = data.averageResponseTime > 0 || data.totalRequests > 0
          dataInfo = `Tempo médio: ${data.averageResponseTime || 0}ms, Requests: ${data.totalRequests || 0}`
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
      
      return { success: true, hasRealData, data: response.data }
    } else {
      console.log(`❌ Status: ${response.status}`)
      return { success: false, hasRealData: false }
    }
  } catch (error) {
    console.log(`❌ Erro: ${error.response?.status || 'Network'} - ${error.response?.data?.statusMessage || error.message}`)
    return { success: false, hasRealData: false }
  }
}

async function testAnalyticsEndpoints() {
  console.log('🧪 TESTE COMPLETO DOS ENDPOINTS DE ANALYTICS')
  console.log('=' .repeat(60))

  // 1. Login como SUPERADMIN
  const superadminToken = await login(SUPERADMIN_CREDENTIALS, 'SUPERADMIN')
  if (!superadminToken) {
    console.log('❌ Não foi possível fazer login como SUPERADMIN')
    return
  }

  // 2. Login como ADMIN
  const adminToken = await login(ADMIN_CREDENTIALS, 'ADMIN')
  if (!adminToken) {
    console.log('❌ Não foi possível fazer login como ADMIN')
  }

  // 3. Testar endpoints do SUPERADMIN
  console.log('\n🔧 TESTANDO ENDPOINTS DO SUPERADMIN')
  console.log('=' .repeat(40))

  const superadminEndpoints = [
    {
      url: `${BASE_URL}/api/superadmin/stats`,
      desc: 'Stats do Sistema (CPU, Memory, Servers, Alerts)'
    },
    {
      url: `${BASE_URL}/api/superadmin/analytics`,
      desc: 'Analytics Gerais do Sistema'
    },
    {
      url: `${BASE_URL}/api/superadmin/analytics?period=24h`,
      desc: 'Analytics 24h'
    },
    {
      url: `${BASE_URL}/api/superadmin/analytics?period=7d`,
      desc: 'Analytics 7 dias'
    },
    {
      url: `${BASE_URL}/api/superadmin/analytics?period=30d`,
      desc: 'Analytics 30 dias'
    }
  ]

  let superadminResults = { total: 0, success: 0, withRealData: 0 }

  for (const endpoint of superadminEndpoints) {
    superadminResults.total++
    const result = await testEndpoint(endpoint.url, superadminToken, endpoint.desc)
    if (result.success) {
      superadminResults.success++
      if (result.hasRealData) {
        superadminResults.withRealData++
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500)) // Aguardar entre requests
  }

  // 4. Testar endpoints de analytics gerais
  console.log('\n📊 TESTANDO ENDPOINTS DE ANALYTICS GERAIS')
  console.log('=' .repeat(40))

  const analyticsEndpoints = [
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
    }
  ]

  let analyticsResults = { total: 0, success: 0, withRealData: 0 }

  for (const endpoint of analyticsEndpoints) {
    analyticsResults.total++
    const result = await testEndpoint(endpoint.url, superadminToken, endpoint.desc)
    if (result.success) {
      analyticsResults.success++
      if (result.hasRealData) {
        analyticsResults.withRealData++
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 5. Testar endpoints do ADMIN (se disponível)
  if (adminToken) {
    console.log('\n👤 TESTANDO ENDPOINTS DO ADMIN')
    console.log('=' .repeat(40))

    // Primeiro, buscar domínios do admin
    try {
      const domainsResponse = await axios.get(`${BASE_URL}/api/admin/domains`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })

      if (domainsResponse.data.success && domainsResponse.data.data.length > 0) {
        const firstDomain = domainsResponse.data.data[0]
        console.log(`📋 Testando com domínio: ${firstDomain.domain} (ID: ${firstDomain.id})`)

        const adminEndpoints = [
          {
            url: `${BASE_URL}/api/admin/domains/${firstDomain.id}/analytics`,
            desc: `Analytics do Domínio ${firstDomain.domain}`
          },
          {
            url: `${BASE_URL}/api/admin/domains/${firstDomain.id}/analytics?period=7`,
            desc: `Analytics 7 dias - ${firstDomain.domain}`
          },
          {
            url: `${BASE_URL}/api/admin/domains/${firstDomain.id}/analytics?period=30`,
            desc: `Analytics 30 dias - ${firstDomain.domain}`
          }
        ]

        let adminResults = { total: 0, success: 0, withRealData: 0 }

        for (const endpoint of adminEndpoints) {
          adminResults.total++
          const result = await testEndpoint(endpoint.url, adminToken, endpoint.desc)
          if (result.success) {
            adminResults.success++
            if (result.hasRealData) {
              adminResults.withRealData++
            }
          }
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        console.log(`\n📊 Resultados ADMIN: ${adminResults.success}/${adminResults.total} funcionando, ${adminResults.withRealData} com dados reais`)
      } else {
        console.log('⚠️ Nenhum domínio encontrado para o admin')
      }
    } catch (error) {
      console.log('❌ Erro ao buscar domínios do admin:', error.message)
    }
  }

  // 6. Relatório final
  console.log('\n📋 RELATÓRIO FINAL')
  console.log('=' .repeat(60))
  console.log(`🔧 SUPERADMIN: ${superadminResults.success}/${superadminResults.total} funcionando, ${superadminResults.withRealData} com dados reais`)
  console.log(`📊 ANALYTICS: ${analyticsResults.success}/${analyticsResults.total} funcionando, ${analyticsResults.withRealData} com dados reais`)
  
  const totalEndpoints = superadminResults.total + analyticsResults.total
  const totalSuccess = superadminResults.success + analyticsResults.success
  const totalWithData = superadminResults.withRealData + analyticsResults.withRealData
  
  console.log(`\n🎯 RESUMO GERAL:`)
  console.log(`✅ Endpoints funcionando: ${totalSuccess}/${totalEndpoints} (${Math.round(totalSuccess/totalEndpoints*100)}%)`)
  console.log(`📊 Com dados reais: ${totalWithData}/${totalSuccess} (${totalSuccess > 0 ? Math.round(totalWithData/totalSuccess*100) : 0}%)`)
  
  if (totalWithData === totalSuccess && totalSuccess === totalEndpoints) {
    console.log(`\n🎉 SUCESSO TOTAL! Todos os endpoints estão funcionando com dados reais!`)
  } else if (totalWithData > 0) {
    console.log(`\n✅ SUCESSO PARCIAL! A maioria dos endpoints tem dados reais.`)
  } else {
    console.log(`\n⚠️ ATENÇÃO! Nenhum endpoint tem dados reais.`)
  }
}

// Executar testes
testAnalyticsEndpoints().catch(console.error)