#!/usr/bin/env node

async function debugDiscrepanciaPrecos() {
  console.log('🔍 DEBUG - DISCREPÂNCIA DE PREÇOS ENTRE APIs\n')
  console.log('=' .repeat(60))

  // Token válido do SUPERADMIN
  const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik1GYjlnYWVOT3krZVpWaWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2p5Y29ueGFsY2ZxdnFha3Jzd25iLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzZWZmYzc1OC1mZjY2LTRmYTMtYmZjOC1mOWM4M2JjZWNiMmIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYxMDY3ODIxLCJpYXQiOjE3NjEwNjQyMjEsImVtYWlsIjoiYWxheHJpY2FyZHNpbHZhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBbGF4IFJpY2FyZCIsInJvbGUiOiJTVVBFUkFETUlOIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjEwNjQyMjF9XSwic2Vzc2lvbl9pZCI6IjcwYzkwZDM4LTYxYWItNGQxZS05Mjk3LWM5MmE5MGUxMGM0OSIsImlzX2Fub255bW91cyI6ZmFsc2V9.zsBmwy281kBk2ZtigNbVybGzeSGvb-Ls11SwW4p6Gg0'

  const planoId = '591cf50a-885e-4c01-a5fb-10ed5f0218a4' // ID do plano "Básico Updated"

  try {
    // 1. Buscar plano específico via API SUPERADMIN
    console.log('📋 1. BUSCANDO PLANO ESPECÍFICO VIA API SUPERADMIN')
    console.log('-'.repeat(50))
    
    const adminSpecificResponse = await fetch(`https://api.cdnproxy.top/api/superadmin/plans/${planoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log(`📊 Status: ${adminSpecificResponse.status}`)
    
    if (adminSpecificResponse.ok) {
      const adminSpecificResult = await adminSpecificResponse.json()
      console.log('✅ API SUPERADMIN (Específico): SUCESSO')
      console.log('\n📋 DADOS COMPLETOS DO PLANO (SUPERADMIN):')
      console.log(JSON.stringify(adminSpecificResult.data, null, 2))
    } else {
      const errorText = await adminSpecificResponse.text()
      console.log('❌ API SUPERADMIN (Específico): FALHOU')
      console.log(`   Erro: ${errorText}`)
    }

    // 2. Buscar todos os planos via API pública e filtrar o específico
    console.log('\n📋 2. BUSCANDO PLANO VIA API PÚBLICA')
    console.log('-'.repeat(50))
    
    const publicResponse = await fetch('https://api.cdnproxy.top/api/plans', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log(`📊 Status: ${publicResponse.status}`)
    
    if (publicResponse.ok) {
      const publicResult = await publicResponse.json()
      console.log('✅ API Pública: SUCESSO')
      
      const planoPublico = publicResult.data?.find(p => p.id === planoId)
      if (planoPublico) {
        console.log('\n📋 DADOS COMPLETOS DO PLANO (API PÚBLICA):')
        console.log(JSON.stringify(planoPublico, null, 2))
      } else {
        console.log('❌ Plano não encontrado na API pública')
      }
    } else {
      const errorText = await publicResponse.text()
      console.log('❌ API Pública: FALHOU')
      console.log(`   Erro: ${errorText}`)
    }

    // 3. Verificar diretamente no banco via Supabase
    console.log('\n📋 3. VERIFICANDO DIRETAMENTE NO BANCO DE DADOS')
    console.log('-'.repeat(50))
    
    const { createClient } = require('@supabase/supabase-js')
    const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co'
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: planoDirecto, error: dbError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planoId)
      .single()

    if (dbError) {
      console.log('❌ Erro ao buscar no banco:', dbError.message)
    } else {
      console.log('✅ Banco de dados: SUCESSO')
      console.log('\n📋 DADOS DIRETOS DO BANCO:')
      console.log(JSON.stringify(planoDirecto, null, 2))
    }

    // 4. Comparação detalhada
    console.log('\n' + '=' .repeat(60))
    console.log('📊 COMPARAÇÃO DETALHADA')
    console.log('=' .repeat(60))
    
    // Aqui vamos comparar os preços de todas as fontes
    console.log('🔍 ANÁLISE DOS PREÇOS:')
    console.log('   - Banco de dados: Verificar acima')
    console.log('   - API Pública: R$ 10,00 (conforme teste anterior)')
    console.log('   - API SUPERADMIN: R$ 35,99 (conforme teste anterior)')
    
    console.log('\n💡 POSSÍVEIS CAUSAS:')
    console.log('   1. Cache diferente entre as APIs')
    console.log('   2. Lógica de transformação diferente')
    console.log('   3. Filtros ou modificações nos dados')
    console.log('   4. Versões diferentes das APIs')

  } catch (error) {
    console.error('❌ Erro durante o debug:', error.message)
  }
}

debugDiscrepanciaPrecos()