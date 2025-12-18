const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeTableStructure(tableName) {
    try {
        console.log(`\n📋 ANALISANDO TABELA: ${tableName.toUpperCase()}`);
        console.log('=' .repeat(60));
        
        // Primeiro, tentar obter contagem de registros
        const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        
        if (countError) {
            console.log(`❌ Erro ao contar registros: ${countError.message}`);
            return;
        }
        
        console.log(`📊 Total de registros: ${count || 0}`);
        
        if (count > 0) {
            // Se tem registros, pegar alguns exemplos
            const { data: sampleData, error: sampleError } = await supabase
                .from(tableName)
                .select('*')
                .limit(3);
            
            if (sampleError) {
                console.log(`❌ Erro ao obter amostras: ${sampleError.message}`);
                return;
            }
            
            if (sampleData && sampleData.length > 0) {
                const columns = Object.keys(sampleData[0]);
                console.log(`\n🔍 Estrutura da tabela (${columns.length} colunas):`);
                
                columns.forEach((col, index) => {
                    // Analisar os tipos de dados baseado nos valores
                    const values = sampleData.map(row => row[col]).filter(v => v !== null);
                    const types = [...new Set(values.map(v => typeof v))];
                    const hasNull = sampleData.some(row => row[col] === null);
                    
                    let typeInfo = types.join('/');
                    if (hasNull) typeInfo += ' (nullable)';
                    
                    // Mostrar valores de exemplo
                    const exampleValues = values.slice(0, 2).map(v => {
                        if (typeof v === 'string') {
                            return `"${v.length > 30 ? v.substring(0, 30) + '...' : v}"`;
                        }
                        return v.toString();
                    });
                    
                    console.log(`  ${(index + 1).toString().padStart(2)}. ${col.padEnd(20)} | ${typeInfo.padEnd(15)} | Ex: ${exampleValues.join(', ')}`);
                });
                
                // Mostrar alguns registros de exemplo
                console.log(`\n📄 Exemplos de registros (${sampleData.length} primeiros):`);
                sampleData.forEach((row, index) => {
                    console.log(`\n  Registro ${index + 1}:`);
                    Object.entries(row).forEach(([key, value]) => {
                        let displayValue;
                        if (value === null) {
                            displayValue = 'NULL';
                        } else if (typeof value === 'string') {
                            displayValue = value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`;
                        } else if (typeof value === 'object') {
                            displayValue = JSON.stringify(value).substring(0, 50) + '...';
                        } else {
                            displayValue = value.toString();
                        }
                        console.log(`    ${key}: ${displayValue}`);
                    });
                });
            }
        } else {
            console.log('📭 Tabela vazia - tentando descobrir estrutura...');
            
            // Para tabelas específicas, tentar inserir dados de teste
            if (tableName === 'streaming_metrics') {
                await discoverStreamingMetricsStructure();
            } else if (tableName === 'user_sessions') {
                await discoverUserSessionsStructure();
            } else if (tableName === 'api_keys') {
                await discoverApiKeysStructure();
            } else {
                console.log('⚠️  Não é possível determinar a estrutura de uma tabela vazia');
            }
        }
        
    } catch (error) {
        console.log(`❌ Erro ao analisar ${tableName}: ${error.message}`);
    }
}

async function discoverStreamingMetricsStructure() {
    try {
        console.log('🔍 Descobrindo estrutura de streaming_metrics...');
        
        const testData = {
            stream_id: 'structure-test',
            domain_id: '550e8400-e29b-41d4-a716-446655440000',
            domain: 'test-structure.com'
        };
        
        const { data, error } = await supabase
            .from('streaming_metrics')
            .insert(testData)
            .select();
        
        if (!error && data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`✅ Estrutura descoberta (${columns.length} colunas):`);
            
            columns.forEach((col, index) => {
                const value = data[0][col];
                const type = value === null ? 'null' : typeof value;
                console.log(`  ${(index + 1).toString().padStart(2)}. ${col.padEnd(25)} | ${type}`);
            });
            
            // Remover registro de teste
            await supabase
                .from('streaming_metrics')
                .delete()
                .eq('stream_id', 'structure-test');
            
            console.log('🗑️  Registro de teste removido');
        } else {
            console.log(`❌ Erro na descoberta: ${error?.message}`);
        }
    } catch (err) {
        console.log(`❌ Erro inesperado: ${err.message}`);
    }
}

async function discoverUserSessionsStructure() {
    try {
        console.log('🔍 Tentando descobrir estrutura de user_sessions...');
        
        // Tentar inserir um registro mínimo
        const testData = {
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            session_token: 'test-session-token'
        };
        
        const { data, error } = await supabase
            .from('user_sessions')
            .insert(testData)
            .select();
        
        if (!error && data) {
            const columns = Object.keys(data[0]);
            console.log(`✅ Estrutura descoberta (${columns.length} colunas):`);
            columns.forEach((col, index) => {
                console.log(`  ${index + 1}. ${col}`);
            });
            
            // Remover registro de teste
            await supabase
                .from('user_sessions')
                .delete()
                .eq('session_token', 'test-session-token');
        } else {
            console.log(`❌ Erro: ${error?.message}`);
        }
    } catch (err) {
        console.log(`❌ Erro: ${err.message}`);
    }
}

async function discoverApiKeysStructure() {
    try {
        console.log('🔍 Tentando descobrir estrutura de api_keys...');
        
        const testData = {
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            key_name: 'test-key',
            api_key: 'test-api-key-12345'
        };
        
        const { data, error } = await supabase
            .from('api_keys')
            .insert(testData)
            .select();
        
        if (!error && data) {
            const columns = Object.keys(data[0]);
            console.log(`✅ Estrutura descoberta (${columns.length} colunas):`);
            columns.forEach((col, index) => {
                console.log(`  ${index + 1}. ${col}`);
            });
            
            // Remover registro de teste
            await supabase
                .from('api_keys')
                .delete()
                .eq('api_key', 'test-api-key-12345');
        } else {
            console.log(`❌ Erro: ${error?.message}`);
        }
    } catch (err) {
        console.log(`❌ Erro: ${err.message}`);
    }
}

async function detailedAnalysis() {
    try {
        console.log('🚀 ANÁLISE DETALHADA DAS TABELAS SUPABASE');
        console.log('=' .repeat(60));
        
        // Lista das tabelas descobertas
        const allTables = [
            'users', 'domains', 'access_logs', 'streaming_metrics', 
            'domain_analytics', 'plans', 'transactions', 'servers',
            'notifications', 'user_sessions', 'api_keys', 'webhooks', 
            'logs', 'metrics', 'analytics', 'cache', 'settings', 
            'configurations', 'backups', 'geolocation_cache'
        ];
        
        // Analisar tabelas mais importantes primeiro
        const priorityTables = [
            'streaming_metrics', 'access_logs', 'domain_analytics',
            'users', 'domains', 'plans', 'transactions'
        ];
        
        console.log('🎯 ANALISANDO TABELAS PRIORITÁRIAS...');
        
        for (const tableName of priorityTables) {
            await analyzeTableStructure(tableName);
            await new Promise(resolve => setTimeout(resolve, 500)); // Pausa pequena
        }
        
        console.log('\n\n🔍 ANALISANDO OUTRAS TABELAS...');
        
        const otherTables = allTables.filter(t => !priorityTables.includes(t));
        
        for (const tableName of otherTables) {
            await analyzeTableStructure(tableName);
            await new Promise(resolve => setTimeout(resolve, 300)); // Pausa pequena
        }
        
        console.log('\n\n🎉 ANÁLISE COMPLETA!');
        console.log(`📊 Total de tabelas analisadas: ${allTables.length}`);
        
    } catch (error) {
        console.error('❌ Erro geral na análise:', error.message);
    }
}

detailedAnalysis();