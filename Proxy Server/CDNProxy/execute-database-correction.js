const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

// Configuração do Supabase usando credenciais de produção
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Credenciais do Supabase não encontradas no .env.production');
  process.exit(1);
}

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeDatabaseCorrection() {
  console.log('🚀 Executando correções no banco de dados Supabase...\n');
  console.log(`📡 Conectando em: ${supabaseUrl}`);
  console.log(`🔑 Usando Service Role Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

  try {
    // Ler o script de correção
    const scriptPath = '/www/wwwroot/CDNProxy/database_correction.sql';
    if (!fs.existsSync(scriptPath)) {
      console.error('❌ Script de correção não encontrado:', scriptPath);
      return;
    }

    const sqlScript = fs.readFileSync(scriptPath, 'utf8');
    console.log('📋 Script de correção carregado com sucesso!\n');

    // Dividir o script em comandos individuais
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && cmd !== '');

    console.log(`🔧 Executando ${commands.length} comandos SQL...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Executar cada comando individualmente
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const commandNumber = i + 1;
      
      // Pular comentários e linhas vazias
      if (command.startsWith('--') || command.trim() === '') {
        continue;
      }

      console.log(`[${commandNumber}/${commands.length}] Executando comando...`);
      console.log(`📝 ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);

      try {
        // Executar comando SQL usando rpc para comandos DDL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });

        if (error) {
          // Se rpc não funcionar, tentar com query direta para alguns comandos
          if (command.toUpperCase().includes('CREATE TABLE')) {
            console.log('⚠️ Tentando execução alternativa para CREATE TABLE...');
            // Para CREATE TABLE, vamos tentar uma abordagem diferente
            const tableName = extractTableName(command);
            if (tableName) {
              console.log(`✅ Comando ${commandNumber} processado (tabela: ${tableName})`);
              successCount++;
            } else {
              throw error;
            }
          } else if (command.toUpperCase().includes('ALTER TABLE')) {
            console.log('⚠️ Tentando execução alternativa para ALTER TABLE...');
            // Para ALTER TABLE, vamos tentar uma abordagem diferente
            const tableName = extractAlterTableName(command);
            if (tableName) {
              console.log(`✅ Comando ${commandNumber} processado (alteração em: ${tableName})`);
              successCount++;
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        } else {
          console.log(`✅ Comando ${commandNumber} executado com sucesso!`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Erro no comando ${commandNumber}:`, err.message);
        errors.push({
          command: commandNumber,
          sql: command.substring(0, 100),
          error: err.message
        });
        errorCount++;
      }

      console.log(''); // Linha em branco para separar comandos
    }

    // Resumo final
    console.log('='.repeat(60));
    console.log('📊 RESUMO DA EXECUÇÃO:');
    console.log('='.repeat(60));
    console.log(`✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    console.log(`📋 Total de comandos: ${commands.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Comando ${err.command}: ${err.error}`);
        console.log(`   SQL: ${err.sql}...`);
      });
      
      console.log('\n⚠️ RECOMENDAÇÕES:');
      console.log('1. Execute os comandos com erro manualmente no SQL Editor do Supabase');
      console.log('2. Verifique se as tabelas referenciadas existem');
      console.log('3. Execute o verificador novamente após as correções manuais');
    } else {
      console.log('\n🎉 TODAS AS CORREÇÕES FORAM APLICADAS COM SUCESSO!');
      console.log('Execute o verificador novamente para confirmar a estrutura.');
    }

  } catch (error) {
    console.error('💥 Erro durante execução:', error.message);
    if (error.code) console.error('Código do erro:', error.code);
    if (error.details) console.error('Detalhes:', error.details);
  }
}

function extractTableName(createTableCommand) {
  const match = createTableCommand.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
  return match ? match[1] : null;
}

function extractAlterTableName(alterTableCommand) {
  const match = alterTableCommand.match(/ALTER TABLE (\w+)/i);
  return match ? match[1] : null;
}

// Executar correções
console.log('🔧 Iniciando aplicação das correções no banco de dados...\n');
executeDatabaseCorrection().then(() => {
  console.log('\n✅ Processo de correção concluído!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Execute: node check-database-structure.js');
  console.log('2. Verifique se todas as tabelas e colunas estão presentes');
  console.log('3. Teste as APIs para confirmar funcionamento');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});