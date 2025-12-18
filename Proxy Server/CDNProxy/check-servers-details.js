const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ixpzqjqzjvvfqzjzjvvf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cHpxanF6anZ2ZnF6anpqdnZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU4NzI4MSwiZXhwIjoyMDUxMTYzMjgxfQ.Ej4rp3vHZ_Qs8DELcb_6FN8kEcdhVg7VgLNqBvxcVQs'
);

async function checkServersDetails() {
  try {
    console.log('🔍 Verificando detalhes dos servidores...\n');
    
    const { data: servers, error } = await supabase
      .from('servers')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar servidores:', error);
      return;
    }
    
    console.log(`📊 Total de servidores: ${servers.length}\n`);
    
    servers.forEach((server, index) => {
      console.log(`🖥️  Servidor ${index + 1}:`);
      console.log(`   ID: ${server.id}`);
      console.log(`   Nome: ${server.name || 'N/A'}`);
      console.log(`   Hostname: ${server.hostname || 'N/A'}`);
      console.log(`   IP: ${server.ip_address || 'N/A'}`);
      console.log(`   Tipo: ${server.type || 'N/A'}`);
      console.log(`   Status: ${server.status || 'N/A'}`);
      console.log(`   Criado em: ${server.created_at || 'N/A'}`);
      console.log(`   Atualizado em: ${server.updated_at || 'N/A'}`);
      console.log(`   Último health check: ${server.last_health_check || 'N/A'}`);
      console.log('   ---');
    });
    
    // Verificar hostname atual
    const os = require('os');
    console.log(`\n🖥️  Hostname atual do sistema: ${os.hostname()}`);
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

checkServersDetails();
