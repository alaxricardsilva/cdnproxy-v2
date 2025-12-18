const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createSystemMetricsTables() {
  console.log('🔧 Criando tabelas de métricas do sistema...')

  try {
    // 1. Criar tabela system_metrics
    console.log('📊 Criando tabela system_metrics...')
    const { error: metricsError } = await supabase.rpc('execute_sql', {
      sql: `
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
      `
    })

    if (metricsError) {
      console.error('❌ Erro ao criar tabela system_metrics:', metricsError)
    } else {
      console.log('✅ Tabela system_metrics criada com sucesso')
    }

    // 2. Criar tabela system_alerts
    console.log('🚨 Criando tabela system_alerts...')
    const { error: alertsError } = await supabase.rpc('execute_sql', {
      sql: `
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
      `
    })

    if (alertsError) {
      console.error('❌ Erro ao criar tabela system_alerts:', alertsError)
    } else {
      console.log('✅ Tabela system_alerts criada com sucesso')
    }

    // 3. Criar tabela servers
    console.log('🖥️ Criando tabela servers...')
    const { error: serversError } = await supabase.rpc('execute_sql', {
      sql: `
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
      `
    })

    if (serversError) {
      console.error('❌ Erro ao criar tabela servers:', serversError)
    } else {
      console.log('✅ Tabela servers criada com sucesso')
    }

    // 4. Inserir dados iniciais
    console.log('📝 Inserindo dados iniciais...')
    
    // Inserir servidor atual
    const { error: insertServerError } = await supabase
      .from('servers')
      .upsert({
        name: 'Servidor Principal',
        hostname: 'localhost',
        ip_address: '127.0.0.1',
        status: 'active',
        server_type: 'web',
        location: 'Local',
        specs: {
          cpu_cores: 4,
          memory_gb: 8,
          disk_gb: 100
        }
      }, { onConflict: 'hostname' })

    if (insertServerError) {
      console.error('❌ Erro ao inserir servidor inicial:', insertServerError)
    } else {
      console.log('✅ Servidor inicial inserido')
    }

    // Inserir métrica inicial
    const { error: insertMetricError } = await supabase
      .from('system_metrics')
      .insert({
        cpu_usage: 25.0,
        memory_usage: 60.0,
        disk_usage: 45.0,
        load_average: 1.2
      })

    if (insertMetricError) {
      console.error('❌ Erro ao inserir métrica inicial:', insertMetricError)
    } else {
      console.log('✅ Métrica inicial inserida')
    }

    console.log('🎉 Tabelas de métricas do sistema criadas com sucesso!')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
createSystemMetricsTables()