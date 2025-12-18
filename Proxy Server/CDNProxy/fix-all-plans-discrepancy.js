#!/usr/bin/env node

async function fixAllPlansDiscrepancy() {
  console.log('🔧 CORREÇÃO DE TODOS OS PLANOS COM DISCREPÂNCIA\n')
  console.log('=' .repeat(60))

  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY'
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Buscar todos os planos ativos
    console.log('📋 1. BUSCANDO TODOS OS PLANOS ATIVOS')
    console.log('-'.repeat(50))
    
    const { data: todosPlanos, error: errorTodos } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)

    if (errorTodos) {
      console.log('❌ Erro ao buscar planos:', errorTodos.message)
      return
    }

    console.log(`📊 Encontrados ${todosPlanos.length} planos ativos`)

    // 2. Identificar planos com discrepância
    const planosComDiscrepancia = todosPlanos.filter(plano => {
      return plano.monthly_price !== plano.price && plano.price === 0
    })

    console.log(`🔍 Planos com discrepância (price = 0): ${planosComDiscrepancia.length}`)

    if (planosComDiscrepancia.length === 0) {
      console.log('✅ Nenhum plano com discrepância encontrado!')
      return
    }

    // 3. Corrigir cada plano
    console.log('\n🔧 2. CORRIGINDO PLANOS COM DISCREPÂNCIA')
    console.log('-'.repeat(50))

    for (const plano of planosComDiscrepancia) {
      console.log(`\n📦 Corrigindo: ${plano.name}`)
      console.log(`   - ID: ${plano.id}`)
      console.log(`   - monthly_price atual: R$ ${plano.monthly_price}`)
      console.log(`   - price atual: R$ ${plano.price}`)

      // Usar monthly_price como referência
      const precoCorreto = plano.monthly_price

      const { data: planoAtualizado, error: errorUpdate } = await supabase
        .from('plans')
        .update({
          price: precoCorreto,
          updated_at: new Date().toISOString()
        })
        .eq('id', plano.id)
        .select()
        .single()

      if (errorUpdate) {
        console.log(`   ❌ Erro ao atualizar: ${errorUpdate.message}`)
        continue
      }

      console.log(`   ✅ Atualizado! Novo price: R$ ${planoAtualizado.price}`)
    }

    // 4. Verificação final
    console.log('\n🔍 3. VERIFICAÇÃO FINAL')
    console.log('-'.repeat(50))
    
    const { data: planosVerificacao, error: errorVerificacao } = await supabase
      .from('plans')
      .select('id, name, monthly_price, price, yearly_price')
      .eq('is_active', true)

    if (errorVerificacao) {
      console.log('❌ Erro na verificação:', errorVerificacao.message)
      return
    }

    console.log('📋 ESTADO FINAL DE TODOS OS PLANOS:')
    planosVerificacao.forEach(plano => {
      const discrepancia = plano.monthly_price !== plano.price
      console.log(`\n   📦 ${plano.name}:`)
      console.log(`      - monthly_price: R$ ${plano.monthly_price}`)
      console.log(`      - price: R$ ${plano.price}`)
      console.log(`      - yearly_price: R$ ${plano.yearly_price}`)
      console.log(`      - Status: ${discrepancia ? '❌ DISCREPÂNCIA' : '✅ CONSISTENTE'}`)
    })

    console.log('\n' + '=' .repeat(60))
    console.log('✅ CORREÇÃO DE TODOS OS PLANOS CONCLUÍDA!')
    console.log('💡 Todos os preços agora devem estar consistentes.')
    console.log('🔄 Recomenda-se recriar o Docker e testar as APIs.')

  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message)
  }
}

fixAllPlansDiscrepancy()