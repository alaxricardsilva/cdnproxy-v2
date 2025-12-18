const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.production' })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeAllTables() {
  console.log('🔍 Analisando todas as tabelas do Supabase...\n')

  try {
    // Lista de tabelas conhecidas do sistema
    const tables = [
      'users',
      'domains', 
      'transactions',
      'access_logs',
      'geolocation_cache',
      'plans',
      'system_logs',
      'security_logs',
      'backups',
      'servers',
      'alerts',
      'notifications'
    ]

    const analysis = {}

    for (const table of tables) {
      console.log(`📊 Analisando tabela: ${table}`)
      
      try {
        // Contar total de registros
        const { count: totalCount, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (countError) {
          if (countError.code === 'PGRST116' || countError.message.includes('does not exist')) {
            analysis[table] = {
              exists: false,
              error: 'Tabela não existe',
              totalRecords: 0
            }
            console.log(`  ❌ Tabela ${table} não existe`)
            continue
          } else {
            throw countError
          }
        }

        // Buscar alguns registros de exemplo
        const { data: sampleData, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(5)

        if (sampleError) {
          throw sampleError
        }

        // Analisar estrutura e conteúdo
        const tableAnalysis = {
          exists: true,
          totalRecords: totalCount || 0,
          sampleRecords: sampleData?.length || 0,
          structure: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [],
          dataTypes: {},
          suspiciousData: [],
          realData: true
        }

        // Analisar tipos de dados e identificar possíveis dados simulados
        if (sampleData && sampleData.length > 0) {
          const firstRecord = sampleData[0]
          
          for (const [key, value] of Object.entries(firstRecord)) {
            tableAnalysis.dataTypes[key] = typeof value
            
            // Verificar se há dados que parecem simulados
            if (typeof value === 'string') {
              const lowerValue = value.toLowerCase()
              if (lowerValue.includes('test') || 
                  lowerValue.includes('mock') || 
                  lowerValue.includes('fake') || 
                  lowerValue.includes('example') ||
                  lowerValue.includes('simulado') ||
                  lowerValue.includes('teste')) {
                tableAnalysis.suspiciousData.push({
                  field: key,
                  value: value,
                  reason: 'Contém palavras suspeitas de dados simulados'
                })
              }
            }
          }

          // Verificar padrões específicos por tabela
          if (table === 'users') {
            const testEmails = sampleData.filter(user => 
              user.email && (
                user.email.includes('test') || 
                user.email.includes('example') ||
                user.email.includes('@teste.com') ||
                user.email.includes('@mock.com')
              )
            )
            if (testEmails.length > 0) {
              tableAnalysis.suspiciousData.push({
                field: 'email',
                count: testEmails.length,
                examples: testEmails.slice(0, 3).map(u => u.email),
                reason: 'Emails de teste encontrados'
              })
            }
          }

          if (table === 'domains') {
            const testDomains = sampleData.filter(domain => 
              domain.domain && (
                domain.domain.includes('test') || 
                domain.domain.includes('example') ||
                domain.domain.includes('mock') ||
                domain.domain.includes('localhost')
              )
            )
            if (testDomains.length > 0) {
              tableAnalysis.suspiciousData.push({
                field: 'domain',
                count: testDomains.length,
                examples: testDomains.slice(0, 3).map(d => d.domain),
                reason: 'Domínios de teste encontrados'
              })
            }
          }

          if (table === 'transactions') {
            const testTransactions = sampleData.filter(tx => 
              (tx.payment_id && tx.payment_id.includes('test')) ||
              (tx.status && tx.status === 'test') ||
              (tx.amount && tx.amount === 0.01) // Valor típico de teste
            )
            if (testTransactions.length > 0) {
              tableAnalysis.suspiciousData.push({
                field: 'various',
                count: testTransactions.length,
                reason: 'Transações de teste encontradas'
              })
            }
          }
        }

        analysis[table] = tableAnalysis
        
        console.log(`  ✅ ${totalCount || 0} registros encontrados`)
        if (tableAnalysis.suspiciousData.length > 0) {
          console.log(`  ⚠️  ${tableAnalysis.suspiciousData.length} possíveis dados simulados detectados`)
        }

      } catch (error) {
        analysis[table] = {
          exists: false,
          error: error.message,
          totalRecords: 0
        }
        console.log(`  ❌ Erro ao analisar ${table}: ${error.message}`)
      }
    }

    // Resumo da análise
    console.log('\n📋 RESUMO DA ANÁLISE:')
    console.log('=' .repeat(50))
    
    let totalTables = 0
    let existingTables = 0
    let tablesWithData = 0
    let tablesWithSuspiciousData = 0
    let totalRecords = 0

    for (const [tableName, tableData] of Object.entries(analysis)) {
      totalTables++
      
      if (tableData.exists) {
        existingTables++
        totalRecords += tableData.totalRecords || 0
        
        if (tableData.totalRecords > 0) {
          tablesWithData++
        }
        
        if (tableData.suspiciousData && tableData.suspiciousData.length > 0) {
          tablesWithSuspiciousData++
        }
      }
    }

    console.log(`📊 Total de tabelas analisadas: ${totalTables}`)
    console.log(`✅ Tabelas existentes: ${existingTables}`)
    console.log(`📈 Tabelas com dados: ${tablesWithData}`)
    console.log(`⚠️  Tabelas com dados suspeitos: ${tablesWithSuspiciousData}`)
    console.log(`🔢 Total de registros: ${totalRecords}`)

    // Detalhes das tabelas com dados suspeitos
    if (tablesWithSuspiciousData > 0) {
      console.log('\n🚨 TABELAS COM DADOS SUSPEITOS:')
      console.log('=' .repeat(50))
      
      for (const [tableName, tableData] of Object.entries(analysis)) {
        if (tableData.suspiciousData && tableData.suspiciousData.length > 0) {
          console.log(`\n📋 Tabela: ${tableName}`)
          console.log(`   Total de registros: ${tableData.totalRecords}`)
          console.log(`   Dados suspeitos encontrados:`)
          
          tableData.suspiciousData.forEach((suspicious, index) => {
            console.log(`   ${index + 1}. Campo: ${suspicious.field}`)
            console.log(`      Motivo: ${suspicious.reason}`)
            if (suspicious.value) {
              console.log(`      Valor: ${suspicious.value}`)
            }
            if (suspicious.count) {
              console.log(`      Quantidade: ${suspicious.count}`)
            }
            if (suspicious.examples) {
              console.log(`      Exemplos: ${suspicious.examples.join(', ')}`)
            }
          })
        }
      }
    }

    // Salvar análise completa em arquivo
    const fs = require('fs')
    fs.writeFileSync('supabase-tables-analysis.json', JSON.stringify(analysis, null, 2))
    console.log('\n💾 Análise completa salva em: supabase-tables-analysis.json')

    return analysis

  } catch (error) {
    console.error('❌ Erro na análise:', error)
    throw error
  }
}

// Executar análise
analyzeAllTables()
  .then(() => {
    console.log('\n✅ Análise concluída com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Falha na análise:', error)
    process.exit(1)
  })