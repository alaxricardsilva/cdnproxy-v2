const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addEpisodeColumns() {
    try {
        console.log('🚀 Adicionando colunas de episode tracking...');
        
        // Lista de colunas para adicionar em domain_analytics
        const domainAnalyticsColumns = [
            'country TEXT',
            'episode_id TEXT',
            'session_id TEXT',
            'change_type TEXT',
            'content_id TEXT',
            'client_ip TEXT',
            'device_type TEXT',
            'user_agent TEXT',
            'bytes_transferred INTEGER DEFAULT 0',
            'duration_seconds INTEGER DEFAULT 0',
            'status_code INTEGER'
        ];
        
        // Lista de colunas para adicionar em streaming_metrics (apenas as que não existem)
        const streamingMetricsColumns = [
            'user_agent TEXT',
            'bandwidth_mbps DECIMAL(10,2)'
        ];
        
        console.log('\n📋 Adicionando colunas em domain_analytics...');
        
        for (const column of domainAnalyticsColumns) {
            try {
                const columnName = column.split(' ')[0];
                console.log(`⏳ Adicionando coluna: ${columnName}`);
                
                // Verificar se a coluna já existe
                const { data: existingCol } = await supabase
                    .from('information_schema.columns')
                    .select('column_name')
                    .eq('table_name', 'domain_analytics')
                    .eq('column_name', columnName)
                    .single();
                
                if (existingCol) {
                    console.log(`  ⚠️  Coluna ${columnName} já existe`);
                    continue;
                }
                
                // Executar ALTER TABLE diretamente
                const { error } = await supabase.rpc('exec_sql', {
                    query: `ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS ${column};`
                });
                
                if (error) {
                    console.log(`  ❌ Erro ao adicionar ${columnName}: ${error.message}`);
                } else {
                    console.log(`  ✅ Coluna ${columnName} adicionada com sucesso`);
                }
                
            } catch (err) {
                console.log(`  ❌ Erro inesperado: ${err.message}`);
            }
        }
        
        console.log('\n📋 Adicionando colunas em streaming_metrics...');
        
        for (const column of streamingMetricsColumns) {
            try {
                const columnName = column.split(' ')[0];
                console.log(`⏳ Adicionando coluna: ${columnName}`);
                
                // Verificar se a coluna já existe
                const { data: existingCol } = await supabase
                    .from('information_schema.columns')
                    .select('column_name')
                    .eq('table_name', 'streaming_metrics')
                    .eq('column_name', columnName)
                    .single();
                
                if (existingCol) {
                    console.log(`  ⚠️  Coluna ${columnName} já existe`);
                    continue;
                }
                
                // Executar ALTER TABLE diretamente
                const { error } = await supabase.rpc('exec_sql', {
                    query: `ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS ${column};`
                });
                
                if (error) {
                    console.log(`  ❌ Erro ao adicionar ${columnName}: ${error.message}`);
                } else {
                    console.log(`  ✅ Coluna ${columnName} adicionada com sucesso`);
                }
                
            } catch (err) {
                console.log(`  ❌ Erro inesperado: ${err.message}`);
            }
        }
        
        // Verificar estrutura final das tabelas
        console.log('\n🔍 Verificando estrutura final das tabelas...');
        
        // Verificar streaming_metrics
        const { data: streamingCols, error: streamingError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'streaming_metrics')
            .order('column_name');
            
        if (!streamingError && streamingCols) {
            console.log(`\n📋 streaming_metrics tem ${streamingCols.length} colunas:`);
            const episodeColumns = streamingCols.filter(col => 
                ['episode_id', 'session_id', 'change_type', 'content_id', 'client_ip', 'country', 'user_agent', 'bandwidth_mbps'].includes(col.column_name)
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
                ['episode_id', 'session_id', 'change_type', 'content_id', 'client_ip', 'country', 'user_agent', 'device_type'].includes(col.column_name)
            );
            episodeColumns.forEach(col => {
                console.log(`  ✅ ${col.column_name} (${col.data_type})`);
            });
        }
        
        console.log('\n🎉 Processo de adição de colunas concluído!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        process.exit(1);
    }
}

addEpisodeColumns();