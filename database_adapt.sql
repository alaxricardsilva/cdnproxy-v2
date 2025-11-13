-- Adaptação das tabelas existentes para pagamentos, PIX, Mercado Pago e PagSeguro

-- Adiciona campos de relacionamento e integração nas tabelas existentes

-- Tabela users (se for personalizada, adapte conforme necessário)
-- Já existe, apenas referência para relacionamentos

-- Tabela plans
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS description TEXT;

-- Tabela domains
ALTER TABLE domains
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

-- Tabela payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id),
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id),
ADD COLUMN IF NOT EXISTS gateway VARCHAR(32), -- 'pix', 'mercadopago', 'pagseguro'
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(128),
ADD COLUMN IF NOT EXISTS status VARCHAR(32), -- 'pending', 'paid', 'failed'
ADD COLUMN IF NOT EXISTS payload JSONB,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Tabela pix_transactions
ALTER TABLE pix_transactions
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id),
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS pix_code TEXT,
ADD COLUMN IF NOT EXISTS bank_recognition TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(32),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Tabela monthly_traffic
ALTER TABLE monthly_traffic
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id);

-- Tabela geolocation_cache
ALTER TABLE geolocation_cache
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id);

-- Tabela access_logs
ALTER TABLE access_logs
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id),
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Tabela configurations
ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id);

-- Criação de índice para facilitar buscas
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_domain_id ON payments(domain_id);
CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_payment_id ON pix_transactions(payment_id);