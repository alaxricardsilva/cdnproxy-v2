#!/usr/bin/env node

async function debugLoginSuperAdmin() {
  console.log('🔍 DEBUG - LOGIN SUPERADMIN\n')
  console.log('=' .repeat(50))

  const credenciais = {
    email: 'alaxricardsilva@gmail.com',
    password: 'Admin123'
  }

  try {
    console.log('📧 Email:', credenciais.email)
    console.log('🔑 Fazendo login...')

    const loginResponse = await fetch('https://api.cdnproxy.top/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credenciais)
    })

    console.log(`📊 Status do login: ${loginResponse.status}`)
    console.log(`📊 Headers:`, Object.fromEntries(loginResponse.headers.entries()))

    if (loginResponse.ok) {
      const loginResult = await loginResponse.json()
      
      console.log('\n📋 RESPOSTA COMPLETA DO LOGIN:')
      console.log('=' .repeat(50))
      console.log(JSON.stringify(loginResult, null, 2))
      console.log('=' .repeat(50))

      // Tentar diferentes caminhos para o token
      const possibleTokenPaths = [
        loginResult.token,
        loginResult.data?.token,
        loginResult.access_token,
        loginResult.data?.access_token,
        loginResult.session?.access_token,
        loginResult.data?.session?.access_token
      ]

      console.log('\n🔍 Procurando token em diferentes caminhos:')
      possibleTokenPaths.forEach((token, index) => {
        if (token) {
          console.log(`✅ Caminho ${index + 1}: Token encontrado!`)
          console.log(`   Token: ${token.substring(0, 50)}...`)
        } else {
          console.log(`❌ Caminho ${index + 1}: Não encontrado`)
        }
      })

      // Verificar se há algum token válido
      const validToken = possibleTokenPaths.find(token => token && typeof token === 'string')
      
      if (validToken) {
        console.log('\n🧪 Testando token encontrado...')
        
        const testResponse = await fetch('https://api.cdnproxy.top/api/superadmin/plans', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${validToken}`
          }
        })

        console.log(`📊 Status do teste: ${testResponse.status}`)

        if (testResponse.ok) {
          console.log('✅ TOKEN VÁLIDO!')
          
          // Salvar token
          const fs = require('fs')
          fs.writeFileSync('/www/wwwroot/CDNProxy/token-superadmin.txt', validToken)
          console.log('💾 Token salvo em: token-superadmin.txt')
        } else {
          const errorText = await testResponse.text()
          console.log('❌ Token inválido:', errorText)
        }
      }

    } else {
      const errorText = await loginResponse.text()
      console.log('❌ FALHA NO LOGIN')
      console.log(`   Erro: ${errorText}`)
    }

  } catch (error) {
    console.error('❌ Erro durante o processo:', error.message)
  }
}

debugLoginSuperAdmin()