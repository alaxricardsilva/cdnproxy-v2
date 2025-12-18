const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addEpisodeColumns() {
  console.log('🔧 Adicionando colunas necessárias para episode tracking...');
  
  const alterCommands = [
    // Colunas para streaming_metrics
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS episode_id VARCHAR(255)",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS change_type VARCHAR(50)",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS content_id VARCHAR(255)",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS device_type VARCHAR(50)",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS country VARCHAR(10)",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS user_agent TEXT",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS bytes_transferred BIGINT",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS duration_seconds INTEGER",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS quality VARCHAR(20)",
    "ALTER TABLE streaming_metrics ADD COLUMN IF NOT EXISTS bandwidth_mbps DECIMAL(10,2)",
    
    // Colunas para domain_analytics
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS episode_id VARCHAR(255)",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS change_type VARCHAR(50)",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS content_id VARCHAR(255)",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS device_type VARCHAR(50)",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS user_agent TEXT",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS bytes_transferred BIGINT",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS duration_seconds INTEGER",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS quality VARCHAR(20)",
    "ALTER TABLE domain_analytics ADD COLUMN IF NOT EXISTS bandwidth_mbps DECIMAL(10,2)"
  ];
  
  for (let i = 0; i < alterCommands.length; i++) {
    const command = alterCommands[i];
    console.log(`${i + 1}. ${command.substring(0, 60)}...`);
    
    try {
      // Usar uma query SQL direta
      const { error } = await supabase.rpc('exec', { 
        sql: command 
      });
      
      if (error) {
        console.log(`❌ Erro: ${error.message}`);
      } else {
        console.log(`✅ Sucesso`);
      }
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
    }
  }
  
  console.log('🎉 Processo concluído!');
}

addEpisodeColumns();