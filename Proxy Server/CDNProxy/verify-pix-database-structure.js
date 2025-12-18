const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './backend/.env.production' })

async function verifyPixDatabaseStructure() {
  console.log('🔍 VERIFICAÇÃO DA ESTRUTURA DO BANCO DE DADOS PARA PIX');
  console.log('====================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Verificar tabela transactions
    console.log('📋 1. VERIFICANDO TABELA TRANSACTIONS:');
    console.log('======================================\n');

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)

    if (transError) {
      console.error('❌ Erro ao acessar tabela transactions:', transError.message)
      console.error('   Detalhes:', transError)
    } else {
      console.log('✅ Tabela transactions acessível!')
      
      if (transactions && transactions.length > 0) {
        console.log('\n📊 Campos encontrados na tabela transactions:')
        const fields = Object.keys(transactions[0])
        fields.forEach(field => {
          const value = transactions[0][field]
          const type = value === null ? 'null' : typeof value
          console.log(`   - ${field}: ${type}`)
        })

        // Verificar campo metadata especificamente
        console.log('\n🔍 Verificando campo METADATA:')
        if (fields.includes('metadata')) {
          const metadata = transactions[0].metadata
          console.log('   ✅ Campo metadata existe!')
          console.log(`   Tipo: ${typeof metadata}`)
          if (metadata && typeof metadata === 'object') {
            console.log('   Estrutura atual do metadata:')
            console.log(JSON.stringify(metadata, null, 6))
          }
        } else {
          console.log('   ❌ Campo metadata NÃO encontrado!')
        }
      } else {
        console.log('\n⚠️  Tabela transactions está vazia. Verificando estrutura...')
      }
    }

    // 2. Verificar tabela pix_config
    console.log('\n\n📋 2. VERIFICANDO TABELA PIX_CONFIG:');
    console.log('====================================\n');

    const { data: pixConfig, error: pixError } = await supabase
      .from('pix_config')
      .select('*')
      .limit(1)

    if (pixError) {
      if (pixError.code === 'PGRST116') {
        console.log('⚠️  Tabela pix_config existe mas está vazia')
      } else if (pixError.message.includes('does not exist')) {
        console.log('❌ Tabela pix_config NÃO EXISTE!')
        console.log('\n📝 SQL para criar tabela pix_config:')
        console.log(`
CREATE TABLE pix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type VARCHAR(20) NOT NULL,
  key VARCHAR(255) NOT NULL,
  receiver_name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO pix_config (key_type, key, receiver_name, city, enabled)
VALUES ('email', 'admin@cdnproxy.top', 'CDNProxy', 'SAO PAULO', true);
        `)
      } else {
        console.log('❌ Erro ao acessar pix_config:', pixError.message)
      }
    } else {
      console.log('✅ Tabela pix_config acessível!')
      if (pixConfig && pixConfig.length > 0) {
        console.log('\n📊 Configuração PIX encontrada:')
        console.log(JSON.stringify(pixConfig[0], null, 2))
      }
    }

    // 3. Verificar campos necessários para PIX
    console.log('\n\n📋 3. CAMPOS NECESSÁRIOS PARA PIX:');
    console.log('==================================\n');

    const requiredFields = {
      'transactions': [
        { name: 'id', type: 'uuid', description: 'ID da transação' },
        { name: 'user_id', type: 'uuid', description: 'ID do usuário' },
        { name: 'amount', type: 'numeric/decimal', description: 'Valor da transação' },
        { name: 'currency', type: 'varchar', description: 'Moeda (BRL)' },
        { name: 'type', type: 'varchar', description: 'Tipo de transação' },
        { name: 'status', type: 'varchar', description: 'Status (pending, completed, etc)' },
        { name: 'payment_method', type: 'varchar', description: 'Método de pagamento (pix)' },
        { name: 'description', type: 'text', description: 'Descrição da transação' },
        { name: 'metadata', type: 'jsonb', description: 'Dados adicionais (PIX code, QR code, etc)' },
        { name: 'created_at', type: 'timestamp', description: 'Data de criação' },
        { name: 'updated_at', type: 'timestamp', description: 'Data de atualização' }
      ]
    }

    if (transactions && transactions.length > 0) {
      const existingFields = Object.keys(transactions[0])
      
      console.log('Verificando campos obrigatórios:\n')
      requiredFields.transactions.forEach(field => {
        const exists = existingFields.includes(field.name)
        const icon = exists ? '✅' : '❌'
        console.log(`${icon} ${field.name.padEnd(20)} (${field.type})`)
        console.log(`   ${field.description}`)
      })

      const missingFields = requiredFields.transactions
        .filter(f => !existingFields.includes(f.name))
        .map(f => f.name)

      if (missingFields.length > 0) {
        console.log('\n⚠️  CAMPOS FALTANTES:', missingFields.join(', '))
        console.log('\n📝 SQL para adicionar campos faltantes:')
        missingFields.forEach(fieldName => {
          const field = requiredFields.transactions.find(f => f.name === fieldName)
          console.log(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ${field.name} ${field.type};`)
        })
      } else {
        console.log('\n✅ TODOS OS CAMPOS NECESSÁRIOS EXISTEM!')
      }
    }

    // 4. Teste de inserção de metadata PIX
    console.log('\n\n📋 4. TESTANDO ESTRUTURA DE METADATA PIX:');
    console.log('==========================================\n');

    console.log('Estrutura esperada do metadata para PIX:')
    const expectedMetadata = {
      plan_id: 'uuid',
      plan_name: 'string',
      domains: 'array',
      pix_key: 'string',
      pix_amount: 'number',
      pix_description: 'string',
      pix_code: 'string (EMV)',
      qr_code: 'string (EMV)',
      qr_code_image: 'string (data:image/png;base64...)',
      qr_code_base64: 'string (base64)',
      pix_key_type: 'string (EMAIL, CPF, CNPJ, etc)',
      duration_value: 'number',
      duration_type: 'string'
    }

    console.log(JSON.stringify(expectedMetadata, null, 2))

    // 5. Buscar transações PIX existentes
    console.log('\n\n📋 5. VERIFICANDO TRANSAÇÕES PIX EXISTENTES:');
    console.log('============================================\n');

    const { data: pixTransactions, error: pixTransError } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_method', 'pix')
      .order('created_at', { ascending: false })
      .limit(3)

    if (pixTransError) {
      console.log('❌ Erro ao buscar transações PIX:', pixTransError.message)
    } else {
      if (pixTransactions && pixTransactions.length > 0) {
        console.log(`✅ Encontradas ${pixTransactions.length} transações PIX`)
        pixTransactions.forEach((trans, index) => {
          console.log(`\n${index + 1}. Transação ${trans.id}:`)
          console.log(`   Status: ${trans.status}`)
          console.log(`   Valor: ${trans.amount} ${trans.currency}`)
          console.log(`   Criada em: ${trans.created_at}`)
          
          if (trans.metadata) {
            console.log('   Metadata PIX:')
            const metadataKeys = Object.keys(trans.metadata)
            metadataKeys.forEach(key => {
              if (key.includes('pix') || key.includes('qr')) {
                const value = trans.metadata[key]
                const preview = typeof value === 'string' && value.length > 50 
                  ? value.substring(0, 50) + '...' 
                  : value
                console.log(`     - ${key}: ${preview}`)
              }
            })
          } else {
            console.log('   ⚠️  Metadata vazio')
          }
        })
      } else {
        console.log('⚠️  Nenhuma transação PIX encontrada no banco')
      }
    }

    // 6. Verificar variável de ambiente PIX_KEY
    console.log('\n\n📋 6. VERIFICANDO CONFIGURAÇÃO DE AMBIENTE:');
    console.log('===========================================\n');

    const pixKey = process.env.PIX_KEY
    if (pixKey) {
      console.log(`✅ PIX_KEY configurada: ${pixKey}`)
    } else {
      console.log('⚠️  PIX_KEY não configurada no .env.production')
      console.log('   Adicione: PIX_KEY=sua_chave_pix@exemplo.com')
    }

    // 7. Resumo final
    console.log('\n\n📋 RESUMO DA VERIFICAÇÃO:');
    console.log('=========================\n');

    const summary = {
      transactions_table: !transError ? '✅ Acessível' : '❌ Erro',
      pix_config_table: !pixError || pixError.code === 'PGRST116' ? '✅ Existe' : '❌ Não existe',
      metadata_field: transactions && transactions.length > 0 && transactions[0].metadata !== undefined ? '✅ Existe' : '⚠️  Verificar',
      pix_transactions: pixTransactions && pixTransactions.length > 0 ? `✅ ${pixTransactions.length} encontradas` : '⚠️  Nenhuma',
      pix_key_env: pixKey ? '✅ Configurada' : '⚠️  Não configurada'
    }

    Object.entries(summary).forEach(([key, value]) => {
      console.log(`${key.padEnd(25)}: ${value}`)
    })

    console.log('\n✅ Verificação concluída!\n')

  } catch (error) {
    console.error('\n❌ ERRO DURANTE A VERIFICAÇÃO:', error.message)
    console.error('Detalhes:', error)
  }
}

// Executar verificação
verifyPixDatabaseStructure().catch(console.error)
