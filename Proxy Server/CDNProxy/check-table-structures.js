const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructures() {
    try {
        console.log('🔍 Verificando estrutura das tabelas...');
        
        // Verificar streaming_metrics
        console.log('\n📋 ESTRUTURA DA TABELA: streaming_metrics');
        const { data: streamingCols, error: streamingError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'streaming_metrics')
            .order('column_name');
            
        if (streamingError) {
            console.error('❌ Erro ao consultar streaming_metrics:', streamingError.message);
        } else if (streamingCols) {
            console.log(`Total de colunas: ${streamingCols.length}`);
            streamingCols.forEach((col, index) => {
                const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
                console.log(`  ${index + 1}. ${col.column_name} - ${col.data_type} ${nullable}`);
            });
            
            // Verificar colunas específicas para episode tracking
            const episodeTrackingColumns = [
                'episode_id', 'session_id', 'change_type', 'content_id', 
                'client_ip', 'country', 'device_type', 'user_agent'
            ];
            
            console.log('\n🎯 Colunas para Episode Tracking:');
            episodeTrackingColumns.forEach(colName => {
                const found = streamingCols.find(col => col.column_name === colName);
                if (found) {
                    console.log(`  ✅ ${colName} - ${found.data_type} (${found.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
                } else {
                    console.log(`  ❌ ${colName} - NÃO EXISTE`);
                }
            });
        }
        
        // Verificar domain_analytics
        console.log('\n📋 ESTRUTURA DA TABELA: domain_analytics');
        const { data: domainCols, error: domainError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'domain_analytics')
            .order('column_name');
            
        if (domainError) {
            console.error('❌ Erro ao consultar domain_analytics:', domainError.message);
        } else if (domainCols) {
            console.log(`Total de colunas: ${domainCols.length}`);
            domainCols.forEach((col, index) => {
                const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
                console.log(`  ${index + 1}. ${col.column_name} - ${col.data_type} ${nullable}`);
            });
            
            // Verificar colunas específicas para episode tracking
            const episodeTrackingColumns = [
                'episode_id', 'session_id', 'change_type', 'content_id', 
                'client_ip', 'country', 'device_type', 'user_agent'
            ];
            
            console.log('\n🎯 Colunas para Episode Tracking:');
            episodeTrackingColumns.forEach(colName => {
                const found = domainCols.find(col => col.column_name === colName);
                if (found) {
                    console.log(`  ✅ ${colName} - ${found.data_type} (${found.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
                } else {
                    console.log(`  ❌ ${colName} - NÃO EXISTE`);
                }
            });
        }
        
        console.log('\n🎉 Verificação concluída!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        process.exit(1);
    }
}

checkTableStructures();