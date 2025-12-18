-- Script SQL para criar tabelas de analytics no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Primeiro, verificar se a tabela domains existe, se não, criar uma versão básica
CREATE TABLE IF NOT EXISTS domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para logs de acesso detalhados
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_id UUID,
    domain VARCHAR(255) NOT NULL,
    path VARCHAR(500) DEFAULT '/',
    method VARCHAR(10) DEFAULT 'GET',
    status_code INTEGER DEFAULT 200,
    client_ip INET,
    real_ip INET,
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    timezone VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    bytes_transferred BIGINT DEFAULT 0,
    bytes_sent BIGINT DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    endpoint_type VARCHAR(50), -- cdn, stream, redirect
    request_headers JSONB,
    response_headers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas necessárias na tabela access_logs se não existirem
DO $$
BEGIN
    -- Adicionar coluna device_type se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'device_type'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN device_type VARCHAR(50);
        COMMENT ON COLUMN access_logs.device_type IS 'Tipo de dispositivo: desktop, mobile, tablet, smarttv, iptv';
    END IF;
    
    -- Adicionar outras colunas essenciais se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'bytes_transferred'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN bytes_transferred BIGINT DEFAULT 0;
        COMMENT ON COLUMN access_logs.bytes_transferred IS 'Total de bytes transferidos';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'bytes_sent'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN bytes_sent BIGINT DEFAULT 0;
        COMMENT ON COLUMN access_logs.bytes_sent IS 'Total de bytes enviados';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'response_time_ms'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN response_time_ms INTEGER DEFAULT 0;
        COMMENT ON COLUMN access_logs.response_time_ms IS 'Tempo de resposta em milissegundos';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'endpoint_type'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN endpoint_type VARCHAR(50);
        COMMENT ON COLUMN access_logs.endpoint_type IS 'Tipo de endpoint: cdn, stream, redirect';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'request_headers'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN request_headers JSONB;
        COMMENT ON COLUMN access_logs.request_headers IS 'Headers da requisição em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'response_headers'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN response_headers JSONB;
        COMMENT ON COLUMN access_logs.response_headers IS 'Headers da resposta em formato JSON';
    END IF;
END $$;

-- Adicionar foreign key constraint apenas se a tabela domains existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domains') THEN
        ALTER TABLE access_logs 
        ADD CONSTRAINT fk_access_logs_domain_id 
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint já existe, ignorar
        NULL;
END $$;

-- Tabela para dados de analytics agregados por dia
CREATE TABLE IF NOT EXISTS analytics_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_id UUID,
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_bandwidth BIGINT DEFAULT 0, -- em bytes
    visits INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    avg_session_duration INTEGER DEFAULT 0, -- em segundos
    countries JSONB DEFAULT '{}', -- {"BR": 100, "US": 50}
    cities JSONB DEFAULT '{}',
    devices JSONB DEFAULT '{}', -- {"desktop": 80, "mobile": 20}
    browsers JSONB DEFAULT '{}',
    operating_systems JSONB DEFAULT '{}',
    user_agents JSONB DEFAULT '{}',
    top_pages JSONB DEFAULT '[]', -- [{"path": "/", "views": 100}]
    referrers JSONB DEFAULT '{}',
    status_codes JSONB DEFAULT '{}', -- {"200": 950, "404": 50}
    hourly_distribution JSONB DEFAULT '{}', -- {"00": 10, "01": 5, ...}
    response_times JSONB DEFAULT '{}', -- {"avg": 250, "min": 50, "max": 1000}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(domain_id, date)
);

-- Adicionar colunas necessárias na tabela analytics_data se não existirem
DO $$
BEGIN
    -- Adicionar colunas essenciais se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'total_requests'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN total_requests INTEGER DEFAULT 0;
        COMMENT ON COLUMN analytics_data.total_requests IS 'Total de requisições no dia';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'unique_visitors'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN unique_visitors INTEGER DEFAULT 0;
        COMMENT ON COLUMN analytics_data.unique_visitors IS 'Visitantes únicos no dia';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'total_bandwidth'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN total_bandwidth BIGINT DEFAULT 0;
        COMMENT ON COLUMN analytics_data.total_bandwidth IS 'Largura de banda total em bytes';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'visits'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN visits INTEGER DEFAULT 0;
        COMMENT ON COLUMN analytics_data.visits IS 'Número de visitas no dia';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'page_views'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN page_views INTEGER DEFAULT 0;
        COMMENT ON COLUMN analytics_data.page_views IS 'Visualizações de página no dia';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'bounce_rate'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN bounce_rate DECIMAL(5,2) DEFAULT 0.00;
        COMMENT ON COLUMN analytics_data.bounce_rate IS 'Taxa de rejeição em porcentagem';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'avg_session_duration'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN avg_session_duration INTEGER DEFAULT 0;
        COMMENT ON COLUMN analytics_data.avg_session_duration IS 'Duração média da sessão em segundos';
    END IF;
    
    -- Adicionar colunas JSONB se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'countries'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN countries JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.countries IS 'Distribuição por países em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'cities'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN cities JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.cities IS 'Distribuição por cidades em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'devices'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN devices JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.devices IS 'Distribuição por dispositivos em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'browsers'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN browsers JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.browsers IS 'Distribuição por navegadores em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'operating_systems'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN operating_systems JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.operating_systems IS 'Distribuição por sistemas operacionais em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'user_agents'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN user_agents JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.user_agents IS 'User agents em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'top_pages'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN top_pages JSONB DEFAULT '[]';
        COMMENT ON COLUMN analytics_data.top_pages IS 'Páginas mais visitadas em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'referrers'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN referrers JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.referrers IS 'Referenciadores em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'status_codes'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN status_codes JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.status_codes IS 'Códigos de status HTTP em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'hourly_distribution'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN hourly_distribution JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.hourly_distribution IS 'Distribuição por hora em formato JSON';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'response_times'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN response_times JSONB DEFAULT '{}';
        COMMENT ON COLUMN analytics_data.response_times IS 'Tempos de resposta em formato JSON';
    END IF;
END $$;

-- Adicionar foreign key constraint para analytics_data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domains') THEN
        ALTER TABLE analytics_data 
        ADD CONSTRAINT fk_analytics_data_domain_id 
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint já existe, ignorar
        NULL;
END $$;

-- Tabela para métricas de streaming específicas
CREATE TABLE IF NOT EXISTS streaming_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_id UUID,
    session_id VARCHAR(255),
    client_ip INET,
    user_agent TEXT,
    country VARCHAR(100),
    stream_url TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    bytes_streamed BIGINT DEFAULT 0,
    quality VARCHAR(20), -- 1080p, 720p, 480p, etc
    buffer_events INTEGER DEFAULT 0,
    error_events INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas necessárias na tabela streaming_metrics se não existirem
DO $$
BEGIN
    -- Adicionar coluna start_time se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'start_time'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        COMMENT ON COLUMN streaming_metrics.start_time IS 'Horário de início da sessão de streaming';
    END IF;
    
    -- Adicionar coluna end_time se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'end_time'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN streaming_metrics.end_time IS 'Horário de fim da sessão de streaming';
    END IF;
    
    -- Adicionar coluna duration_seconds se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'duration_seconds'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN duration_seconds INTEGER DEFAULT 0;
        COMMENT ON COLUMN streaming_metrics.duration_seconds IS 'Duração da sessão em segundos';
    END IF;
    
    -- Adicionar coluna bytes_streamed se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'bytes_streamed'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN bytes_streamed BIGINT DEFAULT 0;
        COMMENT ON COLUMN streaming_metrics.bytes_streamed IS 'Total de bytes transmitidos';
    END IF;
    
    -- Adicionar coluna quality se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'quality'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN quality VARCHAR(20);
        COMMENT ON COLUMN streaming_metrics.quality IS 'Qualidade do stream: 1080p, 720p, 480p, etc';
    END IF;
    
    -- Adicionar coluna buffer_events se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'buffer_events'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN buffer_events INTEGER DEFAULT 0;
        COMMENT ON COLUMN streaming_metrics.buffer_events IS 'Número de eventos de buffer';
    END IF;
    
    -- Adicionar coluna error_events se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'error_events'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN error_events INTEGER DEFAULT 0;
        COMMENT ON COLUMN streaming_metrics.error_events IS 'Número de eventos de erro';
    END IF;
    
    -- Adicionar coluna session_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN session_id VARCHAR(255);
        COMMENT ON COLUMN streaming_metrics.session_id IS 'Identificador único da sessão de streaming';
    END IF;
    
    -- Adicionar coluna device_type se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'device_type'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN device_type VARCHAR(50);
        COMMENT ON COLUMN streaming_metrics.device_type IS 'Tipo de dispositivo: desktop, mobile, tablet, smarttv, iptv';
    END IF;
END $$;

-- Adicionar foreign key constraint para streaming_metrics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domains') THEN
        ALTER TABLE streaming_metrics 
        ADD CONSTRAINT fk_streaming_metrics_domain_id 
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint já existe, ignorar
        NULL;
END $$;

-- Índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_access_logs_domain_id ON access_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_client_ip ON access_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_access_logs_country ON access_logs(country);
CREATE INDEX IF NOT EXISTS idx_access_logs_device_type ON access_logs(device_type);

CREATE INDEX IF NOT EXISTS idx_analytics_data_domain_id ON analytics_data(domain_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data_date ON analytics_data(date);
CREATE INDEX IF NOT EXISTS idx_analytics_data_domain_date ON analytics_data(domain_id, date);

CREATE INDEX IF NOT EXISTS idx_streaming_metrics_domain_id ON streaming_metrics(domain_id);
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_start_time ON streaming_metrics(start_time);
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_session_id ON streaming_metrics(session_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_access_logs_updated_at 
    BEFORE UPDATE ON access_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_data_updated_at 
    BEFORE UPDATE ON analytics_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança (permitir acesso apenas para service_role)
CREATE POLICY "Enable all access for service_role" ON access_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service_role" ON analytics_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all access for service_role" ON streaming_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- Comentários para documentação
COMMENT ON TABLE access_logs IS 'Logs detalhados de todos os acessos ao sistema CDN';
COMMENT ON TABLE analytics_data IS 'Dados de analytics agregados por domínio e data';
COMMENT ON TABLE streaming_metrics IS 'Métricas específicas para sessões de streaming';

COMMENT ON COLUMN access_logs.endpoint_type IS 'Tipo de endpoint: cdn, stream, redirect';
COMMENT ON COLUMN analytics_data.countries IS 'Distribuição de visitantes por país em formato JSON';
COMMENT ON COLUMN analytics_data.hourly_distribution IS 'Distribuição de tráfego por hora do dia';