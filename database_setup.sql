-- Remover tabelas existentes
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS geolocation_cache CASCADE;
DROP TABLE IF EXISTS monthly_traffic CASCADE;
DROP TABLE IF EXISTS configurations CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS domains CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Criar tabela de usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPERADMIN', 'ADMIN', 'USER')),
    name VARCHAR(255),
    company VARCHAR(255),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir credenciais de teste
INSERT INTO users (email, password, role, name, company, status) VALUES
('alaxricardsilva@gmail.com', 'Admin123', 'SUPERADMIN', 'Super Admin', 'Admin Corp', TRUE),
('alaxricardsilva@outlook.com', 'Admin123', 'ADMIN', 'Admin User', 'Admin Corp', TRUE);

-- Criar tabela de planos
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de domínios
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP,
    ssl_enabled BOOLEAN DEFAULT FALSE,
    analytics_enabled BOOLEAN DEFAULT FALSE,
    redirect_301 BOOLEAN DEFAULT FALSE,
    proxy_enabled BOOLEAN DEFAULT TRUE,
    cdn_enabled BOOLEAN DEFAULT TRUE,
    target_url VARCHAR(255),
    user_id INT REFERENCES users(id),
    plan_id INT REFERENCES plans(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de pagamentos
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de configurações
CREATE TABLE configurations (
    id SERIAL PRIMARY KEY,
    system_name VARCHAR(255) NOT NULL,
    payment_methods JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de tráfego mensal
CREATE TABLE monthly_traffic (
    id SERIAL PRIMARY KEY,
    domain_id INT REFERENCES domains(id) ON DELETE CASCADE,
    traffic_in_gb DECIMAL(10, 2) NOT NULL,
    month DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de cache de geolocalização
CREATE TABLE geolocation_cache (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) UNIQUE NOT NULL,
    country VARCHAR(100),
    city VARCHAR(100),
    isp VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de logs de acesso
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    domain_id INT REFERENCES domains(id),
    path VARCHAR(255),
    method VARCHAR(10),
    status_code INT,
    client_ip VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    isp VARCHAR(100),
    response_time INT,
    bytes_transferred INT,
    cache_status VARCHAR(50),
    episode_info JSONB,
    session_id VARCHAR(255),
    change_type VARCHAR(50),
    episode_changed BOOLEAN,
    content_id VARCHAR(255),
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);