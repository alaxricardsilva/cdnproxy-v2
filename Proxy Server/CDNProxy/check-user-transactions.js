const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function checkUserTransactions() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔍 Verificando usuário alaxricardsilva@outlook.com...')
    
    // Buscar o usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'alaxricardsilva@outlook.com')
      .single()
    
    if (userError) {
      console.log('❌ Erro ao buscar usuário:', userError.message)
      return
    }
    
    console.log('✅ Usuário encontrado:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    
    // Buscar transações do usuário
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (transError) {
      console.log('❌ Erro ao buscar transações:', transError.message)
    } else {
      console.log(`\n📊 Transações do usuário: ${transactions.length}`)
      if (transactions.length > 0) {
        transactions.forEach((trans, index) => {
          console.log(`\n${index + 1}. Transação ${trans.id}:`)
          console.log(`   Status: ${trans.status}`)
          console.log(`   Valor: ${trans.amount} ${trans.currency}`)
          console.log(`   Método: ${trans.payment_method}`)
          console.log(`   Criada em: ${trans.created_at}`)
        })
      } else {
        console.log('   Nenhuma transação encontrada para este usuário')
      }
    }
    
    // Verificar todas as transações para debug
    console.log('\n🔍 Verificando todas as transações no sistema...')
    const { data: allTrans, error: allError } = await supabase
      .from('transactions')
      .select('id, user_id, status, amount, created_at')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.log('❌ Erro ao buscar todas as transações:', allError.message)
    } else {
      console.log(`📈 Total de transações no sistema: ${allTrans.length}`)
      allTrans.forEach((trans, index) => {
        console.log(`${index + 1}. ${trans.id} - User: ${trans.user_id} - Status: ${trans.status} - ${trans.amount}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

checkUserTransactions()
