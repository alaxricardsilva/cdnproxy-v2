-- =====================================================
-- SCRIPT DE CORREÇÃO DO BANCO DE DADOS SUPABASE
-- Gerado automaticamente em 2025-10-29T16:48:04.456Z
-- =====================================================

-- =====================================================
-- ADICIONANDO COLUNAS FALTANTES
-- =====================================================

-- Colunas faltantes na tabela: profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TEXT;

-- Colunas faltantes na tabela: system_logs
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE system_logs ADD COLUMN IF NOT EXISTS created_at TEXT;

-- Colunas faltantes na tabela: hls_metrics
ALTER TABLE hls_metrics ADD COLUMN IF NOT EXISTS domain_id TEXT;
ALTER TABLE hls_metrics ADD COLUMN IF NOT EXISTS segment_requests TEXT;
ALTER TABLE hls_metrics ADD COLUMN IF NOT EXISTS playlist_requests TEXT;
ALTER TABLE hls_metrics ADD COLUMN IF NOT EXISTS bandwidth_used TEXT;
ALTER TABLE hls_metrics ADD COLUMN IF NOT EXISTS created_at TEXT;

-- Colunas faltantes na tabela: streaming_metrics
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS domain_id TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS concurrent_viewers TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS total_views TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS peak_viewers TEXT;
ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS created_at TEXT;

-- Colunas faltantes na tabela: domain_analytics
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS domain_id TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS requests TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS unique_visitors TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS bandwidth TEXT;
ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS created_at TEXT;

-- Colunas faltantes na tabela: geolocation_cache
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS country_name TEXT;
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS latitude TEXT;
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS longitude TEXT;
ALTER TABLE geolocation_cache ADD COLUMN IF NOT EXISTS created_at TEXT;

-- =====================================================
-- SCRIPT DE CORREÇÃO CONCLUÍDO
-- =====================================================
