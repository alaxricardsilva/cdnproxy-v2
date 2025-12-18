const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllTables() {
    try {
        console.log('🔍 Listando todas as tabelas do banco de dados Supabase...\n');
        
        // Primeiro, vamos tentar listar as tabelas usando uma abordagem direta
        // Vamos testar algumas tabelas conhecidas primeiro
        const knownTables = [
            'users', 'domains', 'access_logs', 'streaming_metrics', 
            'domain_analytics', 'plans', 'transactions', 'servers',
            'notifications', 'alerts', 'ip_cache', 'geolocation_cache'
        ];
        
        console.log('📋 VERIFICANDO TABELAS CONHECIDAS:\n');
        
        const existingTables = [];
        
        for (const tableName of knownTables) {
            try {
                console.log(`⏳ Verificando tabela: ${tableName}`);
                
                // Tentar fazer uma consulta simples para verificar se a tabela existe
                const { data, error, count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                
                if (error) {
                    if (error.message.includes('does not exist') || error.message.includes('not found')) {
                        console.log(`  ❌ ${tableName} - NÃO EXISTE`);
                    } else {
                        console.log(`  ⚠️  ${tableName} - ERRO: ${error.message}`);
                    }
                } else {
                    console.log(`  ✅ ${tableName} - EXISTE (${count || 0} registros)`);
                    existingTables.push(tableName);
                }
                
            } catch (err) {
                console.log(`  ❌ ${tableName} - ERRO INESPERADO: ${err.message}`);
            }
        }
        
        console.log(`\n📊 RESUMO: ${existingTables.length} tabelas encontradas\n`);
        
        // Agora vamos verificar a estrutura de cada tabela existente
        console.log('🔍 ESTRUTURA DAS TABELAS EXISTENTES:\n');
        
        for (const tableName of existingTables) {
            try {
                console.log(`📋 TABELA: ${tableName.toUpperCase()}`);
                console.log('=' .repeat(50));
                
                // Fazer uma consulta para obter um registro de exemplo e ver as colunas
                const { data: sampleData, error: sampleError } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (sampleError) {
                    console.log(`❌ Erro ao consultar ${tableName}: ${sampleError.message}`);
                } else if (sampleData && sampleData.length > 0) {
                    const columns = Object.keys(sampleData[0]);
                    console.log(`Colunas encontradas (${columns.length}):`);
                    columns.forEach((col, index) => {
                        const value = sampleData[0][col];
                        const type = typeof value;
                        const displayValue = value === null ? 'NULL' : 
                                           type === 'string' ? `"${value.toString().substring(0, 30)}${value.toString().length > 30 ? '...' : ''}"` :
                                           value.toString();
                        console.log(`  ${index + 1}. ${col} (${type}) = ${displayValue}`);
                    });
                } else {
                    // Tabela vazia, tentar inserir um registro temporário para descobrir a estrutura
                    console.log('Tabela vazia. Tentando descobrir estrutura...');
                    
                    // Para algumas tabelas específicas, podemos tentar inserir dados de teste
                    if (tableName === 'streaming_metrics') {
                        try {
                            const testData = {
                                stream_id: 'test-discovery',
                                domain_id: '550e8400-e29b-41d4-a716-446655440000',
                                domain: 'test.com'
                            };
                            
                            const { data: insertData, error: insertError } = await supabase
                                .from(tableName)
                                .insert(testData)
                                .select();
                            
                            if (!insertError && insertData && insertData.length > 0) {
                                const columns = Object.keys(insertData[0]);
                                console.log(`Colunas descobertas (${columns.length}):`);
                                columns.forEach((col, index) => {
                                    const value = insertData[0][col];
                                    const type = typeof value;
                                    console.log(`  ${index + 1}. ${col} (${type})`);
                                });
                                
                                // Remover o registro de teste
                                await supabase
                                    .from(tableName)
                                    .delete()
                                    .eq('stream_id', 'test-discovery');
                                    
                                console.log('✅ Registro de teste removido');
                            } else {
                                console.log(`❌ Erro ao inserir teste: ${insertError?.message}`);
                            }
                        } catch (err) {
                            console.log(`❌ Erro na descoberta: ${err.message}`);
                        }
                    } else {
                        console.log('Estrutura não pode ser determinada (tabela vazia)');
                    }
                }
                
                console.log(''); // Linha em branco
                
            } catch (err) {
                console.log(`❌ Erro ao analisar ${tableName}: ${err.message}\n`);
            }
        }
        
        // Tentar descobrir outras tabelas fazendo consultas diretas
        console.log('🔍 TENTANDO DESCOBRIR OUTRAS TABELAS...\n');
        
        const additionalTables = [
            'user_sessions', 'api_keys', 'webhooks', 'logs', 'metrics',
            'analytics', 'cache', 'settings', 'configurations', 'backups'
        ];
        
        for (const tableName of additionalTables) {
            if (!existingTables.includes(tableName)) {
                try {
                    const { data, error } = await supabase
                        .from(tableName)
                        .select('*', { count: 'exact', head: true });
                    
                    if (!error) {
                        console.log(`✅ DESCOBERTA: ${tableName} - EXISTE`);
                        existingTables.push(tableName);
                    }
                } catch (err) {
                    // Ignorar erros silenciosamente
                }
            }
        }
        
        console.log('\n🎉 VERIFICAÇÃO COMPLETA!');
        console.log(`📊 Total de tabelas encontradas: ${existingTables.length}`);
        console.log('📋 Tabelas existentes:', existingTables.join(', '));
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        process.exit(1);
    }
}

listAllTables();