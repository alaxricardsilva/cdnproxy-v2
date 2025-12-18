-- Criar tabela system_metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
  memory_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
  disk_usage DECIMAL(5,2) DEFAULT 0,
  network_in BIGINT DEFAULT 0,
  network_out BIGINT DEFAULT 0,
  load_average DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at DESC);

-- RLS Policy
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura apenas para admins
DROP POLICY IF EXISTS "system_metrics_read_policy" ON system_metrics;
CREATE POLICY "system_metrics_read_policy" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPERADMIN')
    )
  );

-- Policy para permitir inserção apenas para o sistema
DROP POLICY IF EXISTS "system_metrics_insert_policy" ON system_metrics;
CREATE POLICY "system_metrics_insert_policy" ON system_metrics
  FOR INSERT WITH CHECK (true);

-- Criar tabela system_alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);

-- RLS Policy
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura apenas para admins
DROP POLICY IF EXISTS "system_alerts_read_policy" ON system_alerts;
CREATE POLICY "system_alerts_read_policy" ON system_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPERADMIN')
    )
  );

-- Policy para permitir inserção apenas para o sistema
DROP POLICY IF EXISTS "system_alerts_insert_policy" ON system_alerts;
CREATE POLICY "system_alerts_insert_policy" ON system_alerts
  FOR INSERT WITH CHECK (true);

-- Policy para permitir atualização apenas para admins
DROP POLICY IF EXISTS "system_alerts_update_policy" ON system_alerts;
CREATE POLICY "system_alerts_update_policy" ON system_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPERADMIN')
    )
  );

-- Criar tabela servers
CREATE TABLE IF NOT EXISTS servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  ip_address INET,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  server_type VARCHAR(50) DEFAULT 'web',
  location VARCHAR(100),
  specs JSONB DEFAULT '{}',
  last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_hostname ON servers(hostname);

-- RLS Policy
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura apenas para admins
DROP POLICY IF EXISTS "servers_read_policy" ON servers;
CREATE POLICY "servers_read_policy" ON servers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPERADMIN')
    )
  );

-- Policy para permitir inserção apenas para admins
DROP POLICY IF EXISTS "servers_insert_policy" ON servers;
CREATE POLICY "servers_insert_policy" ON servers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPERADMIN')
    )
  );

-- Policy para permitir atualização apenas para admins
DROP POLICY IF EXISTS "servers_update_policy" ON servers;
CREATE POLICY "servers_update_policy" ON servers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'SUPERADMIN')
    )
  );

-- Inserir dados iniciais
INSERT INTO servers (name, hostname, ip_address, status, server_type, location, specs)
VALUES (
  'Servidor Principal',
  'localhost',
  '127.0.0.1',
  'active',
  'web',
  'Local',
  '{"cpu_cores": 4, "memory_gb": 8, "disk_gb": 100}'::jsonb
) ON CONFLICT (hostname) DO NOTHING;

-- Inserir métrica inicial
INSERT INTO system_metrics (cpu_usage, memory_usage, disk_usage, load_average)
VALUES (25.0, 60.0, 45.0, 1.2);