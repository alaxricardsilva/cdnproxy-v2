-- Script para consultar todas as tabelas e colunas do banco de dados Supabase (PostgreSQL)

-- Lista todas as tabelas do schema público
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Lista todas as colunas de todas as tabelas do schema público
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Lista todas as constraints (chaves primárias, estrangeiras, etc)
SELECT tc.table_name, tc.constraint_type, kcu.column_name, 
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public';