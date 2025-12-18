-- Script SQL para adicionar a coluna 'observations' na tabela 'users'
-- Execute este script no Editor SQL do Supabase

-- Adicionar a coluna observations na tabela users
ALTER TABLE users 
ADD COLUMN observations TEXT;

-- Adicionar comentário na coluna para documentação
COMMENT ON COLUMN users.observations IS 'Campo para observações sobre o usuário';

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'observations';