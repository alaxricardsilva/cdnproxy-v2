-- Script SQL para criar a tabela geolocation_cache no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela geolocation_cache
CREATE TABLE IF NOT EXISTS geolocation_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip INET NOT NULL UNIQUE,
    country VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    country_code VARCHAR(2),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50),
    isp VARCHAR(255),
    org VARCHAR(255),
    as_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários para documentação
COMMENT ON TABLE geolocation_cache IS 'Cache de dados de geolocalização para IPs';
COMMENT ON COLUMN geolocation_cache.ip IS 'Endereço IP (IPv4 ou IPv6)';
COMMENT ON COLUMN geolocation_cache.country IS 'Nome do país';
COMMENT ON COLUMN geolocation_cache.city IS 'Nome da cidade';
COMMENT ON COLUMN geolocation_cache.region IS 'Nome da região/estado';
COMMENT ON COLUMN geolocation_cache.country_code IS 'Código do país (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN geolocation_cache.latitude IS 'Latitude geográfica';
COMMENT ON COLUMN geolocation_cache.longitude IS 'Longitude geográfica';
COMMENT ON COLUMN geolocation_cache.timezone IS 'Fuso horário';
COMMENT ON COLUMN geolocation_cache.isp IS 'Provedor de serviços de internet';
COMMENT ON COLUMN geolocation_cache.org IS 'Organização proprietária do IP';
COMMENT ON COLUMN geolocation_cache.as_number IS 'Número do sistema autônomo';

-- Criar índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_geolocation_cache_ip ON geolocation_cache(ip);
CREATE INDEX IF NOT EXISTS idx_geolocation_cache_country ON geolocation_cache(country);
CREATE INDEX IF NOT EXISTS idx_geolocation_cache_city ON geolocation_cache(city);
CREATE INDEX IF NOT EXISTS idx_geolocation_cache_created_at ON geolocation_cache(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_geolocation_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_geolocation_cache_updated_at 
    BEFORE UPDATE ON geolocation_cache 
    FOR EACH ROW EXECUTE FUNCTION update_geolocation_cache_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE geolocation_cache ENABLE ROW LEVEL SECURITY;

-- Política de segurança (permitir acesso apenas para service_role e authenticated users)
CREATE POLICY "Enable all access for service_role" ON geolocation_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable read access for authenticated users" ON geolocation_cache
    FOR SELECT USING (auth.role() = 'authenticated');

-- Inserir alguns dados de exemplo para teste (opcional)
INSERT INTO geolocation_cache (ip, country, city, region, country_code, latitude, longitude, timezone, isp, org, as_number) 
VALUES 
    ('8.8.8.8', 'United States', 'Mountain View', 'California', 'US', 37.4056, -122.0775, 'America/Los_Angeles', 'Google LLC', 'Google LLC', 'AS15169'),
    ('1.1.1.1', 'Australia', 'Sydney', 'New South Wales', 'AU', -33.8688, 151.2093, 'Australia/Sydney', 'Cloudflare, Inc.', 'APNIC and Cloudflare DNS Resolver project', 'AS13335')
ON CONFLICT (ip) DO NOTHING;

-- Verificar se a tabela foi criada com sucesso
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'geolocation_cache' 
ORDER BY ordinal_position;