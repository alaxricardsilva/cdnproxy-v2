-- Script para corrigir a estrutura da tabela access_logs
-- Alterando o campo country para VARCHAR(100) e adicionando campos faltantes

-- 1. Alterar o campo country para aceitar nomes completos
ALTER TABLE access_logs ALTER COLUMN country TYPE VARCHAR(100);

-- 2. Verificar se os campos existem e adicionar se necessário
DO $$
BEGIN
    -- Adicionar campo status_code se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_logs' AND column_name = 'status_code') THEN
        ALTER TABLE access_logs ADD COLUMN status_code INTEGER;
    END IF;
    
    -- Adicionar campo device_type se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_logs' AND column_name = 'device_type') THEN
        ALTER TABLE access_logs ADD COLUMN device_type VARCHAR(50);
    END IF;
    
    -- Adicionar campo city se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_logs' AND column_name = 'city') THEN
        ALTER TABLE access_logs ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Adicionar campo referer se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_logs' AND column_name = 'referer') THEN
        ALTER TABLE access_logs ADD COLUMN referer TEXT;
    END IF;
    
    -- Adicionar campo access_timestamp se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_logs' AND column_name = 'access_timestamp') THEN
        ALTER TABLE access_logs ADD COLUMN access_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Renomear campo status para status_code se existir e status_code não existir
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'access_logs' AND column_name = 'status') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'access_logs' AND column_name = 'status_code') THEN
        ALTER TABLE access_logs RENAME COLUMN status TO status_code;
    END IF;
    
    -- Se ambos status e status_code existem, remover o campo status duplicado
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'access_logs' AND column_name = 'status') 
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'access_logs' AND column_name = 'status_code') THEN
        ALTER TABLE access_logs DROP COLUMN status;
    END IF;
    
END $$;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_access_logs_domain ON access_logs(domain);
CREATE INDEX IF NOT EXISTS idx_access_logs_domain_id ON access_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_client_ip ON access_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_country ON access_logs(country);
CREATE INDEX IF NOT EXISTS idx_access_logs_device_type ON access_logs(device_type);

-- 4. Verificar a estrutura final da tabela
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'access_logs' 
ORDER BY ordinal_position;