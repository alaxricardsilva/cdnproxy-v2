-- Script SQL para adicionar coluna bytes_transferred nas tabelas do Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- =====================================================
-- TABELA: access_logs
-- =====================================================
-- Adicionar coluna bytes_transferred na tabela access_logs se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'bytes_transferred'
    ) THEN
        ALTER TABLE access_logs ADD COLUMN bytes_transferred BIGINT DEFAULT 0;
        COMMENT ON COLUMN access_logs.bytes_transferred IS 'Total de bytes transferidos (enviados + recebidos)';
        RAISE NOTICE 'Coluna bytes_transferred adicionada à tabela access_logs';
    ELSE
        RAISE NOTICE 'Coluna bytes_transferred já existe na tabela access_logs';
    END IF;
END $$;

-- =====================================================
-- TABELA: analytics_data
-- =====================================================
-- Adicionar coluna bytes_transferred na tabela analytics_data se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'bytes_transferred'
    ) THEN
        ALTER TABLE analytics_data ADD COLUMN bytes_transferred BIGINT DEFAULT 0;
        COMMENT ON COLUMN analytics_data.bytes_transferred IS 'Total de bytes transferidos agregados por dia';
        RAISE NOTICE 'Coluna bytes_transferred adicionada à tabela analytics_data';
    ELSE
        RAISE NOTICE 'Coluna bytes_transferred já existe na tabela analytics_data';
    END IF;
END $$;

-- =====================================================
-- TABELA: streaming_metrics
-- =====================================================
-- Adicionar coluna bytes_transferred na tabela streaming_metrics se não existir
-- (além da coluna bytes_streamed já existente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'bytes_transferred'
    ) THEN
        ALTER TABLE streaming_metrics ADD COLUMN bytes_transferred BIGINT DEFAULT 0;
        COMMENT ON COLUMN streaming_metrics.bytes_transferred IS 'Total de bytes transferidos (complementa bytes_streamed)';
        RAISE NOTICE 'Coluna bytes_transferred adicionada à tabela streaming_metrics';
    ELSE
        RAISE NOTICE 'Coluna bytes_transferred já existe na tabela streaming_metrics';
    END IF;
END $$;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
-- Criar índices para melhorar performance das consultas com bytes_transferred

-- Índice para access_logs
CREATE INDEX IF NOT EXISTS idx_access_logs_bytes_transferred 
ON access_logs(bytes_transferred) 
WHERE bytes_transferred > 0;

-- Índice composto para consultas por data e bytes_transferred
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at_bytes_transferred 
ON access_logs(created_at, bytes_transferred);

-- Índice para analytics_data
CREATE INDEX IF NOT EXISTS idx_analytics_data_bytes_transferred 
ON analytics_data(bytes_transferred) 
WHERE bytes_transferred > 0;

-- Índice para streaming_metrics
CREATE INDEX IF NOT EXISTS idx_streaming_metrics_bytes_transferred 
ON streaming_metrics(bytes_transferred) 
WHERE bytes_transferred > 0;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Verificar se todas as colunas foram criadas corretamente
DO $$
DECLARE
    access_logs_exists BOOLEAN;
    analytics_data_exists BOOLEAN;
    streaming_metrics_exists BOOLEAN;
BEGIN
    -- Verificar access_logs
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'access_logs' AND column_name = 'bytes_transferred'
    ) INTO access_logs_exists;
    
    -- Verificar analytics_data
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analytics_data' AND column_name = 'bytes_transferred'
    ) INTO analytics_data_exists;
    
    -- Verificar streaming_metrics
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'streaming_metrics' AND column_name = 'bytes_transferred'
    ) INTO streaming_metrics_exists;
    
    -- Relatório final
    RAISE NOTICE '=== RELATÓRIO DE VERIFICAÇÃO ===';
    RAISE NOTICE 'access_logs.bytes_transferred: %', CASE WHEN access_logs_exists THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'analytics_data.bytes_transferred: %', CASE WHEN analytics_data_exists THEN '✅ OK' ELSE '❌ FALTANDO' END;
    RAISE NOTICE 'streaming_metrics.bytes_transferred: %', CASE WHEN streaming_metrics_exists THEN '✅ OK' ELSE '❌ FALTANDO' END;
    
    IF access_logs_exists AND analytics_data_exists AND streaming_metrics_exists THEN
        RAISE NOTICE '🎉 Todas as colunas bytes_transferred foram criadas com sucesso!';
    ELSE
        RAISE NOTICE '⚠️ Algumas colunas podem não ter sido criadas. Verifique os logs acima.';
    END IF;
END $$;

-- =====================================================
-- COMENTÁRIOS ADICIONAIS
-- =====================================================
/*
EXPLICAÇÃO DA COLUNA bytes_transferred:

A coluna bytes_transferred representa o total de dados que foram trocados 
entre o cliente e o servidor durante uma requisição ou sessão.

- Valores positivos: Indicam dados enviados do servidor para o cliente (download)
- Valores negativos: Podem indicar dados enviados do cliente para o servidor (upload)
- Valor zero: Indica que não houve transferência de dados ou dados não disponíveis

Esta coluna é essencial para:
1. Cálculo de bandwidth total
2. Análise de tráfego de dados
3. Relatórios de uso de CDN
4. Monitoramento de performance
5. Billing baseado em transferência de dados

TABELAS AFETADAS:
- access_logs: Para logs individuais de acesso
- analytics_data: Para dados agregados diários
- streaming_metrics: Para métricas específicas de streaming
*/