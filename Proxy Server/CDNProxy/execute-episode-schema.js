const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeEpisodeSchema() {
    try {
        console.log('🚀 Iniciando execução do schema de episode tracking...');
        
        // Ler o arquivo SQL
        const sqlFilePath = path.join(__dirname, 'supabase-episode-tracking-schema.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Dividir o SQL em comandos individuais (separados por ponto e vírgula)
        const sqlCommands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📝 Encontrados ${sqlCommands.length} comandos SQL para executar`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Executar cada comando individualmente
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i];
            
            // Pular comentários e linhas vazias
            if (command.startsWith('--') || command.trim() === '') {
                continue;
            }
            
            try {
                console.log(`\n⏳ Executando comando ${i + 1}/${sqlCommands.length}...`);
                console.log(`📄 Comando: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);
                
                const { data, error } = await supabase.rpc('exec', {
                    sql: command + ';'
                });
                
                if (error) {
                    console.error(`❌ Erro no comando ${i + 1}:`, error.message);
                    errorCount++;
                } else {
                    console.log(`✅ Comando ${i + 1} executado com sucesso`);
                    successCount++;
                }
                
                // Pequena pausa entre comandos
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (err) {
                console.error(`❌ Erro inesperado no comando ${i + 1}:`, err.message);
                errorCount++;
            }
        }
        
        console.log('\n📊 RESUMO DA EXECUÇÃO:');
        console.log(`✅ Comandos executados com sucesso: ${successCount}`);
        console.log(`❌ Comandos com erro: ${errorCount}`);
        console.log(`📝 Total de comandos: ${successCount + errorCount}`);
        
        // Verificar se as colunas foram adicionadas
        console.log('\n🔍 Verificando estrutura das tabelas...');
        
        // Verificar streaming_metrics
        const { data: streamingCols, error: streamingError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'streaming_metrics')
            .order('column_name');
            
        if (!streamingError && streamingCols) {
            console.log(`\n📋 streaming_metrics tem ${streamingCols.length} colunas:`);
            const episodeColumns = streamingCols.filter(col => 
                ['episode_id', 'session_id', 'change_type', 'content_id', 'client_ip', 'country'].includes(col.column_name)
            );
            episodeColumns.forEach(col => {
                console.log(`  ✅ ${col.column_name} (${col.data_type})`);
            });
        }
        
        // Verificar domain_analytics
        const { data: domainCols, error: domainError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'domain_analytics')
            .order('column_name');
            
        if (!domainError && domainCols) {
            console.log(`\n📋 domain_analytics tem ${domainCols.length} colunas:`);
            const episodeColumns = domainCols.filter(col => 
                ['episode_id', 'session_id', 'change_type', 'content_id', 'client_ip', 'country'].includes(col.column_name)
            );
            episodeColumns.forEach(col => {
                console.log(`  ✅ ${col.column_name} (${col.data_type})`);
            });
        }
        
        if (errorCount === 0) {
            console.log('\n🎉 Schema de episode tracking executado com sucesso!');
        } else {
            console.log('\n⚠️  Schema executado com alguns erros. Verifique os logs acima.');
        }
        
    } catch (error) {
        console.error('❌ Erro geral na execução do schema:', error.message);
        process.exit(1);
    }
}

executeEpisodeSchema();