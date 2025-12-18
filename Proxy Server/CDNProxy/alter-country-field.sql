-- Alterar o campo country na tabela access_logs para aceitar nomes completos de países
-- Mudando de VARCHAR(2) para VARCHAR(100) para suportar nomes completos em português

ALTER TABLE access_logs 
ALTER COLUMN country TYPE VARCHAR(100);

-- Comentário: Esta alteração permite que o campo country armazene nomes completos de países
-- em português do Brasil, como "Brasil", "Estados Unidos", "Reino Unido", etc.
-- em vez de apenas códigos de 2 letras como "BR", "US", "GB".