-- Remover tabela existente se houver
DROP TABLE IF EXISTS access_logs CASCADE;

-- Criar tabela access_logs com estrutura correta
CREATE TABLE access_logs (
  id BIGSERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  client_ip INET NOT NULL,
  user_agent TEXT,
  device_type TEXT,
  access_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_access_logs_ip ON access_logs(client_ip);
CREATE INDEX idx_access_logs_domain ON access_logs(domain);
CREATE INDEX idx_access_logs_timestamp ON access_logs(access_timestamp);

-- Verificar se a tabela foi criada
SELECT 'Tabela access_logs criada com sucesso!' as message;