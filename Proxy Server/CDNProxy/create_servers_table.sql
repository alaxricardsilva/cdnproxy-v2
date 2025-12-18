-- =====================================================
-- SCRIPT PARA CRIAR TABELA SERVERS FALTANTE
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- Criar tabela servers
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

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_servers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_servers_updated_at
    BEFORE UPDATE ON servers
    FOR EACH ROW
    EXECUTE FUNCTION update_servers_updated_at();

-- Inserir dados iniciais (servidores atuais)
INSERT INTO servers (name, hostname, ip_address, port, type, status, location, description) VALUES
('Servidor 1 BR - Frontend', 'app.cdnproxy.top', '127.0.0.1', 3000, 'api', 'active', 'Local', 'Servidor frontend Nuxt.js'),
('Servidor 2 BR - Backend', 'api.cdnproxy.top', '127.0.0.1', 5001, 'api', 'active', 'Local', 'Servidor backend API'),
('Proxy CDN Server', 'proxy.cdnproxy.top', '127.0.0.1', 8080, 'cdn', 'active', 'Local', 'Servidor de proxy CDN');

-- Verificar se a tabela foi criada corretamente
SELECT 
    'Tabela servers criada com sucesso!' as message,
    COUNT(*) as total_servers
FROM servers;