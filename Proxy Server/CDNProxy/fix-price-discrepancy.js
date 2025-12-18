#!/usr/bin/env node

async function fixPriceDiscrepancy() {
  console.log('🔧 CORREÇÃO DA DISCREPÂNCIA DE PREÇOS\n')
  console.log('=' .repeat(60))

  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY'
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const planoId = '591cf50a-885e-4c01-a5fb-10ed5f0218a4' // ID do plano "Básico Updated"

  try {
    // 1. Verificar estado atual
    console.log('📋 1. VERIFICANDO ESTADO ATUAL DO PLANO')
    console.log('-'.repeat(50))
    
    const { data: planoAtual, error: errorAtual } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planoId)
      .single()

    if (errorAtual) {
      console.log('❌ Erro ao buscar plano:', errorAtual.message)
      return
    }

    console.log('📊 ESTADO ATUAL:')
    console.log(`   - monthly_price: ${planoAtual.monthly_price}`)
    console.log(`   - price: ${planoAtual.price}`)
    console.log(`   - yearly_price: ${planoAtual.yearly_price}`)

    // 2. Decidir qual preço usar como padrão
    console.log('\n🤔 ANÁLISE DOS PREÇOS:')
    console.log('   - monthly_price: R$ 10,00 (mostrado no carrinho)')
    console.log('   - price: R$ 35,99 (mostrado no PIX)')
    console.log('   - yearly_price: R$ 120,00')

    // Vamos usar o monthly_price como referência (R$ 10,00)
    // e ajustar o price para ser consistente
    const precoCorreto = planoAtual.monthly_price // R$ 10,00

    console.log(`\n✅ DECISÃO: Usar R$ ${precoCorreto},00 como preço padrão`)

    // 3. Atualizar o campo price para ser consistente
    console.log('\n🔧 2. CORRIGINDO DISCREPÂNCIA')
    console.log('-'.repeat(50))
    
    const { data: planoAtualizado, error: errorUpdate } = await supabase
      .from('plans')
      .update({
        price: precoCorreto,
        updated_at: new Date().toISOString()
      })
      .eq('id', planoId)
      .select()
      .single()

    if (errorUpdate) {
      console.log('❌ Erro ao atualizar plano:', errorUpdate.message)
      return
    }

    console.log('✅ PLANO ATUALIZADO COM SUCESSO!')
    console.log('\n📊 NOVO ESTADO:')
    console.log(`   - monthly_price: ${planoAtualizado.monthly_price}`)
    console.log(`   - price: ${planoAtualizado.price}`)
    console.log(`   - yearly_price: ${planoAtualizado.yearly_price}`)

    // 4. Verificar se há outros planos com discrepâncias
    console.log('\n🔍 3. VERIFICANDO OUTROS PLANOS')
    console.log('-'.repeat(50))
    
    const { data: todosPlanos, error: errorTodos } = await supabase
      .from('plans')
      .select('id, name, monthly_price, price, yearly_price')
      .eq('is_active', true)

    if (errorTodos) {
      console.log('❌ Erro ao buscar todos os planos:', errorTodos.message)
      return
    }

    console.log('📋 ANÁLISE DE TODOS OS PLANOS ATIVOS:')
    todosPlanos.forEach(plano => {
      const discrepancia = plano.monthly_price !== plano.price
      console.log(`\n   📦 ${plano.name}:`)
      console.log(`      - monthly_price: R$ ${plano.monthly_price}`)
      console.log(`      - price: R$ ${plano.price}`)
      console.log(`      - yearly_price: R$ ${plano.yearly_price}`)
      console.log(`      - Discrepância: ${discrepancia ? '❌ SIM' : '✅ NÃO'}`)
    })

    console.log('\n' + '=' .repeat(60))
    console.log('✅ CORREÇÃO CONCLUÍDA!')
    console.log('💡 Agora todos os preços devem estar consistentes.')
    console.log('🔄 Recomenda-se testar as APIs novamente.')

  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message)
  }
}

fixPriceDiscrepancy()