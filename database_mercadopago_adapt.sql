-- Adaptação do banco para integração Mercado Pago e melhorias nos relacionamentos

-- Adiciona credenciais Mercado Pago na tabela de configurações
ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS mercadopago_public_key VARCHAR(128),
ADD COLUMN IF NOT EXISTS mercadopago_access_token VARCHAR(128),
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS domain_id INTEGER REFERENCES domains(id);

-- Adiciona coluna para identificar gateway de pagamento
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS gateway VARCHAR(32); -- 'pix', 'mercadopago', 'pagseguro'

-- Relaciona transação PIX ao pagamento
ALTER TABLE pix_transactions
ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES payments(id);

-- Sugestão: Adicionar coluna de status ao pagamento
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status VARCHAR(32); -- 'pending', 'paid', 'failed'

-- Sugestão: Adicionar coluna de payload para dados do gateway
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payload JSONB;

-- Sugestão: Adicionar coluna de created_at para registro de data
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE pix_transactions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Criação de índices para facilitar buscas
CREATE INDEX IF NOT EXISTS idx_configurations_user_id ON configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_configurations_domain_id ON configurations(domain_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(gateway);
CREATE INDEX IF NOT EXISTS idx_pix_transactions_payment_id ON pix_transactions(payment_id);

-- Exemplo de consulta para buscar credenciais Mercado Pago
-- SELECT mercadopago_public_key, mercadopago_access_token FROM configurations WHERE user_id = ? OR domain_id = ?;