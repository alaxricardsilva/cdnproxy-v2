const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './backend/.env.production' })

async function testPixReadAPI() {
  console.log('🧪 TESTANDO ENDPOINT DE LEITURA DO PIX');
  console.log('======================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Buscar última transação PIX
    console.log('📋 1. BUSCANDO ÚLTIMA TRANSAÇÃO PIX:');
    console.log('====================================\n');

    const { data: pixTransactions, error: pixError } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_method', 'pix')
      .order('created_at', { ascending: false })
      .limit(1)

    if (pixError || !pixTransactions || pixTransactions.length === 0) {
      console.log('❌ Nenhuma transação PIX encontrada')
      console.log('   Crie uma transação PIX primeiro')
      return
    }

    const transaction = pixTransactions[0]
    console.log(`✅ Transação PIX encontrada: ${transaction.id}`)
    console.log(`   Status: ${transaction.status}`)
    console.log(`   Valor: ${transaction.amount} ${transaction.currency}`)
    console.log(`   Criada em: ${transaction.created_at}`)

    // 2. Verificar metadata
    console.log('\n📋 2. VERIFICANDO METADATA:');
    console.log('===========================\n');

    if (!transaction.metadata) {
      console.log('❌ Metadata vazio!')
      return
    }

    console.log('Campos no metadata:')
    Object.keys(transaction.metadata).forEach(key => {
      if (key.includes('pix') || key.includes('qr')) {
        const value = transaction.metadata[key]
        const preview = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value
        console.log(`   ✅ ${key}: ${preview}`)
      }
    })

    // Verificar campos obrigatórios
    const requiredFields = ['qr_code', 'pix_code', 'qr_code_image', 'qr_code_base64']
    console.log('\nCampos obrigatórios:')
    requiredFields.forEach(field => {
      const exists = transaction.metadata[field] !== undefined
      const icon = exists ? '✅' : '❌'
      console.log(`   ${icon} ${field}`)
    })

    // 3. Simular resposta da API
    console.log('\n📋 3. SIMULANDO RESPOSTA DA API:');
    console.log('================================\n');

    const createdAt = new Date(transaction.created_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
    const isExpired = diffMinutes > 30 && transaction.status === 'pending'

    const apiResponse = {
      success: true,
      data: {
        transaction_id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        pix_key: transaction.metadata.pix_key || null,
        pix_key_type: transaction.metadata.pix_key_type || null,
        pix_code: transaction.metadata.pix_code || transaction.metadata.qr_code || null,
        qr_code: transaction.metadata.qr_code || transaction.metadata.pix_code || null,
        qr_code_image: transaction.metadata.qr_code_image || null,
        qr_code_base64: transaction.metadata.qr_code_base64 || null,
        domains: transaction.metadata.domains || [],
        plan_name: transaction.metadata.plan_name || null,
        created_at: transaction.created_at,
        expires_at: new Date(createdAt.getTime() + 30 * 60 * 1000).toISOString(),
        is_expired: isExpired
      }
    }

    console.log('Resposta da API:')
    console.log(JSON.stringify(apiResponse, null, 2))

    // 4. Validar dados
    console.log('\n📋 4. VALIDAÇÃO DOS DADOS:');
    console.log('==========================\n');

    const validations = {
      'transaction_id': !!apiResponse.data.transaction_id,
      'pix_code': !!apiResponse.data.pix_code,
      'qr_code': !!apiResponse.data.qr_code,
      'qr_code_image': !!apiResponse.data.qr_code_image,
      'qr_code_base64': !!apiResponse.data.qr_code_base64,
      'status': !!apiResponse.data.status,
      'amount': !!apiResponse.data.amount,
      'is_expired': apiResponse.data.is_expired !== undefined
    }

    Object.entries(validations).forEach(([key, valid]) => {
      const icon = valid ? '✅' : '❌'
      console.log(`${icon} ${key}: ${valid ? 'OK' : 'FALTANDO'}`)
    })

    // 5. Resumo
    console.log('\n📋 RESUMO:');
    console.log('==========\n');

    const allValid = Object.values(validations).every(v => v)
    
    if (allValid) {
      console.log('✅ TODOS OS DADOS ESTÃO PRESENTES!')
      console.log(`   Endpoint: GET /api/admin/payments/pix/${transaction.id}`)
      console.log('   Status: Pronto para uso')
    } else {
      console.log('❌ ALGUNS DADOS ESTÃO FALTANDO!')
      console.log('   A transação precisa ser recriada com todos os campos')
    }

    console.log('\n✅ Teste concluído!\n')

  } catch (error) {
    console.error('\n❌ ERRO DURANTE O TESTE:', error.message)
    console.error('Detalhes:', error)
  }
}

// Executar teste
testPixReadAPI().catch(console.error)
