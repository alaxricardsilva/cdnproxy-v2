const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function checkTransactionsTable() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔍 Verificando estrutura da tabela transactions...')
    
    // Tentar buscar uma transação para ver a estrutura
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Erro ao consultar transactions:', error.message)
      console.log('Detalhes do erro:', error)
    } else {
      console.log('✅ Tabela transactions encontrada!')
      if (transactions && transactions.length > 0) {
        console.log('📊 Campos da tabela transactions:')
        console.log(Object.keys(transactions[0]))
        console.log('\n📝 Exemplo de transação:')
        console.log(JSON.stringify(transactions[0], null, 2))
      } else {
        console.log('📊 Tabela transactions existe mas está vazia')
      }
    }
    
    // Verificar se existe alguma transação
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log('❌ Erro ao contar transactions:', countError.message)
    } else {
      console.log(`📈 Total de transações: ${count || 0}`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

checkTransactionsTable()
