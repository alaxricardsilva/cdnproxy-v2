import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://hbiusfcqllxdhkatpjgf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiaXVzZmNxbGx4ZGhrYXRwamdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MjQ3MDEsImV4cCI6MjA3ODAwMDcwMX0.qSYk54cAv9VtezxWnHsZI2pbYMTmhLvw4JAzmYgu1BU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  try {
    const { data, error } = await supabase.rpc('list_tables');

    if (error) {
      console.error('Erro ao listar tabelas:', error);
      return;
    }

    console.log('Tabelas existentes no banco de dados:', data);
  } catch (err) {
    console.error('Erro inesperado:', err);
  }
}

listTables();