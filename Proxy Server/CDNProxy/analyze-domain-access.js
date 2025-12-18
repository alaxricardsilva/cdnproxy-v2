const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDomains() {
  console.log('🌐 [DOMAINS] Analisando domínios cadastrados...\n');
  
  try {
    const { data: domains, error } = await supabase
      .from('domains')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ [DOMAINS] Erro ao buscar domínios:', error);
      return;
    }
    
    console.log(`📊 [DOMAINS] Total de domínios cadastrados: ${domains.length}\n`);
    
    if (domains.length === 0) {
      console.log('⚠️ [DOMAINS] Nenhum domínio cadastrado encontrado!');
      console.log('   Isso explica por que a geolocalização não está sendo processada.');
      console.log('   O middleware só processa IPs para domínios personalizados válidos.\n');
      return;
    }
    
    domains.forEach((domain, index) => {
      console.log(`${index + 1}. Domínio: ${domain.domain}`);
      console.log(`   Status: ${domain.status}`);
      console.log(`   Target URL: ${domain.target_url}`);
      console.log(`   Criado: ${domain.created_at}`);
      console.log(`   Expira: ${domain.expires_at || 'Não definido'}`);
      console.log(`   Redirect 301: ${domain.redirect_301 ? 'Sim' : 'Não'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ [DOMAINS] Erro inesperado:', error);
  }
}

async function analyzeAccessLogs() {
  console.log('📊 [LOGS] Analisando logs de acesso...\n');
  
  try {
    const { data: logs, error } = await supabase
      .from('access_logs')
      .select('*')
      .order('access_timestamp', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('❌ [LOGS] Erro ao buscar logs:', error);
      return;
    }
    
    console.log(`📊 [LOGS] Últimos ${logs.length} logs de acesso:\n`);
    
    const ipCounts = {};
    const hostCounts = {};
    
    logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.access_timestamp}`);
      console.log(`   IP: ${log.client_ip}`);
      console.log(`   Host: ${log.domain || 'Não definido'}`);
      console.log(`   Path: ${log.path}`);
      console.log(`   User-Agent: ${log.user_agent?.substring(0, 80)}${log.user_agent?.length > 80 ? '...' : ''}`);
      console.log(`   Status: ${log.status_code}`);
      console.log('');
      
      // Contar IPs e hosts
      ipCounts[log.client_ip] = (ipCounts[log.client_ip] || 0) + 1;
      if (log.domain) {
        hostCounts[log.domain] = (hostCounts[log.domain] || 0) + 1;
      }
    });
    
    console.log('📊 [LOGS] Estatísticas dos logs:');
    console.log('\n🌐 IPs mais frequentes:');
    Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([ip, count]) => {
        console.log(`   ${ip}: ${count} acessos`);
      });
    
    console.log('\n🏠 Hosts mais frequentes:');
    Object.entries(hostCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([host, count]) => {
        console.log(`   ${host}: ${count} acessos`);
      });
    
  } catch (error) {
    console.error('❌ [LOGS] Erro inesperado:', error);
  }
}

async function crossReferenceData() {
  console.log('\n🔍 [CROSS-REF] Cruzando dados entre cache de IP e logs de acesso...\n');
  
  try {
    // Buscar IPs do cache
    const { data: cacheIPs, error: cacheError } = await supabase
      .from('ip_geo_cache')
      .select('ip, cached_at, country, city');
    
    if (cacheError) {
      console.error('❌ [CROSS-REF] Erro ao buscar cache:', cacheError);
      return;
    }
    
    // Buscar IPs dos logs
    const { data: logIPs, error: logError } = await supabase
      .from('access_logs')
      .select('client_ip, access_timestamp, domain')
      .order('access_timestamp', { ascending: false })
      .limit(100);
    
    if (logError) {
      console.error('❌ [CROSS-REF] Erro ao buscar logs:', logError);
      return;
    }
    
    console.log('🔍 [CROSS-REF] Análise cruzada:');
    console.log(`   IPs no cache: ${cacheIPs.length}`);
    console.log(`   IPs únicos nos logs: ${new Set(logIPs.map(l => l.client_ip)).size}`);
    
    // Verificar quais IPs dos logs estão no cache
    const logIPSet = new Set(logIPs.map(l => l.client_ip));
    const cacheIPSet = new Set(cacheIPs.map(c => c.ip));
    
    console.log('\n📊 [CROSS-REF] IPs dos logs que ESTÃO no cache:');
    const ipsInCache = [...logIPSet].filter(ip => cacheIPSet.has(ip));
    ipsInCache.forEach(ip => {
      const cacheData = cacheIPs.find(c => c.ip === ip);
      const logData = logIPs.find(l => l.client_ip === ip);
      console.log(`   ${ip} - ${cacheData.country}, ${cacheData.city} (Host: ${logData.domain || 'N/A'})`);
    });
    
    console.log('\n⚠️ [CROSS-REF] IPs dos logs que NÃO estão no cache:');
    const ipsNotInCache = [...logIPSet].filter(ip => !cacheIPSet.has(ip));
    ipsNotInCache.forEach(ip => {
      const logData = logIPs.find(l => l.client_ip === ip);
      console.log(`   ${ip} (Host: ${logData.domain || 'N/A'}, Timestamp: ${logData.access_timestamp})`);
    });
    
    if (ipsNotInCache.length > 0) {
      console.log(`\n🚨 [CROSS-REF] PROBLEMA IDENTIFICADO:`);
      console.log(`   ${ipsNotInCache.length} IPs dos logs não foram processados para geolocalização!`);
      console.log(`   Isso indica que o middleware não está sendo executado para esses acessos.`);
    }
    
  } catch (error) {
    console.error('❌ [CROSS-REF] Erro inesperado:', error);
  }
}

async function analyzeSpecificIP() {
  const targetIP = '201.182.93.164';
  console.log(`\n🎯 [SPECIFIC] Análise específica do IP ${targetIP}...\n`);
  
  try {
    // Buscar no cache
    const { data: cacheData, error: cacheError } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .eq('ip', targetIP)
      .single();
    
    if (cacheError && cacheError.code !== 'PGRST116') {
      console.error('❌ [SPECIFIC] Erro ao buscar cache:', cacheError);
    } else if (cacheData) {
      console.log('✅ [SPECIFIC] IP encontrado no cache:');
      console.log(`   País: ${cacheData.country} (${cacheData.country_code})`);
      console.log(`   Cidade: ${cacheData.city}`);
      console.log(`   ISP: ${cacheData.isp}`);
      console.log(`   Cached: ${cacheData.cached_at}`);
      console.log(`   Expires: ${cacheData.expires_at}`);
    } else {
      console.log('❌ [SPECIFIC] IP não encontrado no cache');
    }
    
    // Buscar nos logs
    const { data: logData, error: logError } = await supabase
      .from('access_logs')
      .select('*')
      .eq('client_ip', targetIP)
      .order('access_timestamp', { ascending: false });
    
    if (logError) {
      console.error('❌ [SPECIFIC] Erro ao buscar logs:', logError);
    } else if (logData && logData.length > 0) {
      console.log(`\n📊 [SPECIFIC] IP encontrado em ${logData.length} logs de acesso:`);
      logData.slice(0, 5).forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.access_timestamp}`);
        console.log(`      Host: ${log.domain || 'N/A'}`);
        console.log(`      Path: ${log.path}`);
        console.log(`      Status: ${log.status_code}`);
      });
    } else {
      console.log('❌ [SPECIFIC] IP não encontrado nos logs de acesso');
    }
    
  } catch (error) {
    console.error('❌ [SPECIFIC] Erro inesperado:', error);
  }
}

async function main() {
  console.log('🔍 [ANALYSIS] Iniciando análise de domínios e acessos\n');
  console.log('=' .repeat(60));
  
  await analyzeDomains();
  console.log('=' .repeat(60));
  
  await analyzeAccessLogs();
  console.log('=' .repeat(60));
  
  await crossReferenceData();
  console.log('=' .repeat(60));
  
  await analyzeSpecificIP();
  console.log('=' .repeat(60));
  
  console.log('\n✅ [ANALYSIS] Análise concluída');
}

main().catch(console.error);