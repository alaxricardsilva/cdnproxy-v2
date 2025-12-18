const { createClient } = require('@supabase/supabase-js');

// Carregar configurações do .env.production
require('dotenv').config({ path: './backend/.env.production' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createServersTable() {
    try {
        console.log('🔄 Verificando se tabela servers existe...');
        
        // Tentar selecionar da tabela servers
        const { data, error } = await supabase.from('servers').select('*').limit(1);
        
        if (error && error.code === 'PGRST116') {
            console.log('📝 Tabela servers não existe. Precisa ser criada manualmente no Supabase.');
            console.log('');
            console.log('🔧 Execute o seguinte SQL no SQL Editor do Supabase:');
            console.log('');
            console.log(`
CREATE TABLE IF NOT EXISTS servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET,
    port INTEGER DEFAULT 80,
    type VARCHAR(50) DEFAULT 'proxy' CHECK (type IN ('proxy', 'api', 'database', 'cache', 'cdn')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
    location VARCHAR(100),
    description TEXT,
    last_health_check TIMESTAMP WITH TIME ZONE,
    response_time INTEGER,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_type ON servers(type);
CREATE INDEX IF NOT EXISTS idx_servers_hostname ON servers(hostname);
CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_hostname_unique ON servers(hostname);

-- Inserir dados iniciais
INSERT INTO servers (name, hostname, ip_address, port, type, status, location, description) VALUES
('Frontend Server', 'app.cdnproxy.top', '127.0.0.1', 3000, 'api', 'active', 'Local', 'Servidor frontend Nuxt.js'),
('Backend Server', 'api.cdnproxy.top', '127.0.0.1', 5001, 'api', 'active', 'Local', 'Servidor backend API'),
('Proxy CDN Server', 'proxy.cdnproxy.top', '127.0.0.1', 8080, 'cdn', 'active', 'Local', 'Servidor de proxy CDN');
            `);
            
        } else if (error) {
            console.error('❌ Erro ao verificar tabela:', error);
        } else {
            console.log('✅ Tabela servers já existe!');
            console.log('📊 Dados existentes:', data);
            
            // Inserir dados iniciais se a tabela estiver vazia
            if (data.length === 0) {
                console.log('📝 Inserindo dados iniciais...');
                
                const serversData = [
                    {
                        name: 'Servidor 1 BR - Frontend',
                        hostname: 'app.cdnproxy.top',
                        ip_address: '127.0.0.1',
                        port: 3000,
                        type: 'api',
                        status: 'active',
                        location: 'Local',
                        description: 'Servidor frontend Nuxt.js'
                    },
                    {
                        name: 'Servidor 2 BR - Backend',
                        hostname: 'api.cdnproxy.top',
                        ip_address: '127.0.0.1',
                        port: 5001,
                        type: 'api',
                        status: 'active',
                        location: 'Local',
                        description: 'Servidor backend API'
                    },
                    {
                        name: 'Proxy CDN Server',
                        hostname: 'proxy.cdnproxy.top',
                        ip_address: '127.0.0.1',
                        port: 8080,
                        type: 'cdn',
                        status: 'active',
                        location: 'Local',
                        description: 'Servidor de proxy CDN'
                    }
                ];
                
                const { data: insertData, error: insertError } = await supabase
                    .from('servers')
                    .insert(serversData);
                
                if (insertError) {
                    console.error('❌ Erro ao inserir dados iniciais:', insertError);
                } else {
                    console.log('✅ Dados iniciais inseridos com sucesso!');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

createServersTable();