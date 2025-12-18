const axios = require('axios')
require('dotenv').config()

const BASE_URL = 'https://api.cdnproxy.top'

// Credenciais reais do banco
const SUPERADMIN_CREDENTIALS = {
  email: 'alaxricardsilva@gmail.com',
  password: 'Admin123'
}

const ADMIN_CREDENTIALS = {
  email: 'alaxricardsilva@outlook.com', 
  password: 'Admin123'
}

async function loginAndGetToken(credentials) {
  try {
    console.log(`🔐 Fazendo login com ${credentials.email}...`)
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials)
    
    if (response.data.success) {
       console.log('✅ Login realizado com sucesso')
       return response.data.session.access_token
     } else {
       console.log('❌ Falha no login:', response.data.message)
       return null
     }
  } catch (error) {
    console.log('❌ Erro no login:', error.response?.data?.message || error.message)
    return null
  }
}

async function testWithAuth() {
  const token = await loginAndGetToken(SUPERADMIN_CREDENTIALS)
  if (!token) {
    console.log('❌ Não foi possível fazer login')
    return
  }
  
  console.log('\n🧪 TESTANDO ENDPOINTS COM AUTENTICAÇÃO')
  console.log('=' .repeat(50))
  
  const endpoints = [
    `${BASE_URL}/api/superadmin/stats`,
    `${BASE_URL}/api/superadmin/analytics`,
    `${BASE_URL}/api/superadmin/analytics?period=24h`,
    `${BASE_URL}/api/analytics/performance`,
    `${BASE_URL}/api/analytics/traffic`
  ]
  
  let results = { total: 0, success: 0, withRealData: 0 }
  
  for (const url of endpoints) {
    try {
      console.log(`\n🔍 Testando: ${url}`)
      results.total++
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      
      if (response.status === 200) {
        results.success++
        const data = response.data.data || response.data
        let hasRealData = false
        let info = ''
        
        // Verificar diferentes tipos de dados
        if (data.metrics) {
          hasRealData = data.metrics.pageViews > 0 || data.metrics.uniqueUsers > 0
          info = `${data.metrics.pageViews || 0} pageViews, ${data.metrics.uniqueUsers || 0} usuários`
        }
        
        if (data.users) {
          hasRealData = data.users.total > 0
          info = `${data.users.total} usuários, ${data.domains?.total || 0} domínios`
        }
        
        if (data.totalVisits !== undefined) {
          hasRealData = data.totalVisits > 0
          info = `${data.totalVisits} visitas, ${data.uniqueVisitors || 0} únicos`
        }
        
        if (data.system) {
          hasRealData = true
          info = `Sistema: CPU ${data.system.cpu}%, Memory ${data.system.memory}%, Servers: ${data.system.servers}`
        }
        
        if (hasRealData) results.withRealData++
        
        console.log(`✅ Status: ${response.status} | Dados: ${hasRealData ? '✅ REAIS' : '⚠️ VAZIOS'} | ${info}`)
      } else {
        console.log(`⚠️ Status: ${response.status}`)
      }
      
    } catch (error) {
      console.log(`❌ Erro: ${error.response?.status || 'Network'} - ${error.response?.data?.statusMessage || error.message}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n📊 RESUMO DOS TESTES:')
  console.log(`✅ Endpoints funcionando: ${results.success}/${results.total}`)
  console.log(`📈 Com dados reais: ${results.withRealData}/${results.success}`)
  
  if (results.withRealData === results.success && results.success > 0) {
    console.log('🎉 PERFEITO! Todos os endpoints têm dados reais!')
  } else if (results.withRealData > 0) {
    console.log('✅ BOM! Alguns endpoints têm dados reais.')
  } else {
    console.log('⚠️ ATENÇÃO! Nenhum endpoint tem dados reais.')
  }
}

testWithAuth().catch(console.error)