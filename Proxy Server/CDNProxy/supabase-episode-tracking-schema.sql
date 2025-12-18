-- =====================================================
-- SCHEMA DE EPISODE TRACKING - SUPABASE
-- Gerado automaticamente em 2025-01-29
-- =====================================================

-- =====================================================
-- ADICIONANDO CAMPOS DE EPISODE TRACKING
-- =====================================================

-- Campos ausentes na tabela: domain_analytics (13 campos)
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS episode_id TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS change_type TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS content_id TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS client_ip TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS bytes_transferred INTEGER DEFAULT 0;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS status_code INTEGER;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Campos ausentes na tabela: streaming_metrics (14 campos)
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS episode_id TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS change_type TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS content_id TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS client_ip TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS bytes_transferred INTEGER DEFAULT 0;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS bandwidth_mbps DECIMAL(10,2);
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- ÍNDICES PARA MELHORAR PERFORMANCE
-- =====================================================

-- Índices para domain_analytics
CREATE INDEX IF NOT EXISTS idx_domain_analytics_episode_id ON domain_analytics(episode_id);
CREATE INDEX IF NOT EXISTS idx_domain_analytics_session_id ON domain_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_domain_analytics_created_at ON domain_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_domain_analytics_domain_date ON domain_analytics(domain_id, date);

-- Índices para streaming_metrics
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_episode_id ON streaming_metrics(episode_id);
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_session_id ON streaming_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_domain_id ON streaming_metrics(domain_id);
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_created_at ON streaming_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_client_ip ON streaming_metrics(client_ip);

-- =====================================================
-- TRIGGERS PARA AUTO-UPDATE
-- =====================================================

-- Trigger para domain_analytics
CREATE OR REPLACE FUNCTION update_domain_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_domain_analytics_updated_at
    BEFORE UPDATE ON domain_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_analytics_updated_at();

-- Trigger para streaming_metrics
CREATE OR REPLACE FUNCTION update_streaming_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_streaming_metrics_updated_at
    BEFORE UPDATE ON streaming_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_streaming_metrics_updated_at();

-- =====================================================
-- VIEWS PARA RELATÓRIOS
-- =====================================================

-- View para relatórios de episódios
CREATE OR REPLACE VIEW episode_analytics AS
SELECT 
    sm.episode_id,
    sm.content_id,
    sm.domain,
    COUNT(DISTINCT sm.session_id) as unique_sessions,
    COUNT(*) as total_requests,
    SUM(sm.bytes_transferred) as total_bytes,
    AVG(sm.duration_seconds) as avg_duration,
    MIN(sm.created_at) as first_access,
    MAX(sm.created_at) as last_access,
    COUNT(DISTINCT sm.client_ip) as unique_viewers,
    COUNT(DISTINCT sm.country) as countries_count
FROM streaming_metrics sm
WHERE sm.episode_id IS NOT NULL
GROUP BY sm.episode_id, sm.content_id, sm.domain;

-- View para relatórios de sessões
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    al.session_id,
    al.episode_id,
    al.content_id,
    al.domain,
    al.client_ip,
    al.country,
    al.device_type,
    COUNT(*) as total_requests,
    SUM(al.bytes_sent) as total_bytes_sent,
    AVG(al.response_time_ms) as avg_response_time,
    MIN(al.access_timestamp) as session_start,
    MAX(al.access_timestamp) as session_end,
    EXTRACT(EPOCH FROM (MAX(al.access_timestamp) - MIN(al.access_timestamp))) as session_duration_seconds
FROM access_logs al
WHERE al.session_id IS NOT NULL
GROUP BY al.session_id, al.episode_id, al.content_id, al.domain, al.client_ip, al.country, al.device_type;

-- =====================================================
-- CONSULTAS DE VERIFICAÇÃO
-- =====================================================

-- Verificar se as colunas foram adicionadas corretamente
DO $$
DECLARE
    domain_cols INTEGER;
    streaming_cols INTEGER;
BEGIN
    -- Verificar domain_analytics
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domain_analytics' 
        AND column_name = 'episode_id'
    ) THEN
        RAISE NOTICE '✅ domain_analytics: episode_id adicionado com sucesso';
    ELSE
        RAISE NOTICE '❌ domain_analytics: episode_id NÃO foi adicionado';
    END IF;
    
    -- Verificar streaming_metrics
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' 
        AND column_name = 'episode_id'
    ) THEN
        RAISE NOTICE '✅ streaming_metrics: episode_id adicionado com sucesso';
    ELSE
        RAISE NOTICE '❌ streaming_metrics: episode_id NÃO foi adicionado';
    END IF;
    
    -- Contar colunas totais
    SELECT COUNT(*) INTO domain_cols FROM information_schema.columns WHERE table_name = 'domain_analytics';
    SELECT COUNT(*) INTO streaming_cols FROM information_schema.columns WHERE table_name = 'streaming_metrics';
    
    RAISE NOTICE 'ℹ️  domain_analytics tem % colunas', domain_cols;
    RAISE NOTICE 'ℹ️  streaming_metrics tem % colunas', streaming_cols;
END $$;

-- =====================================================
-- SCHEMA DE EPISODE TRACKING CONCLUÍDO
-- =====================================================

-- Para verificar se tudo foi criado corretamente, execute:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'domain_analytics' ORDER BY column_name;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'streaming_metrics' ORDER BY column_name;