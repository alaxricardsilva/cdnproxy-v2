const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Configuração do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para verificar se IP é privado (copiada do proxy-server.js)
function isPrivateIP(ip) {
  if (!ip || typeof ip !== 'string') return true;
  
  const privateRanges = [
    /^127\./, // localhost
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // link-local
    /^::1$/, // IPv6 localhost
    /^fc00:/, // IPv6 private
    /^fe80:/ // IPv6 link-local
  ];
  
  return privateRanges.some(range => range.test(ip));
}

// Função para buscar geolocalização do cache (copiada do proxy-server.js)
async function getGeolocationFromCache(ip) {
  try {
    console.log(`🔍 [CACHE] Buscando geolocalização no cache para IP: ${ip}`);
    
    const { data, error } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .eq('ip', ip)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      console.log(`❌ [CACHE] Erro ao buscar no cache: ${error.message}`);
      return null;
    }
    
    if (data) {
      console.log(`✅ [CACHE] Geolocalização encontrada no cache para ${ip}`);
      return data;
    }
    
    console.log(`⚠️ [CACHE] Nenhuma geolocalização válida encontrada no cache para ${ip}`);
    return null;
  } catch (error) {
    console.error(`❌ [CACHE] Erro inesperado ao buscar cache:`, error);
    return null;
  }
}

// Função para salvar geolocalização no cache (copiada do proxy-server.js)
async function saveGeolocationToCache(ip, geoData) {
  try {
    console.log(`💾 [CACHE] Salvando geolocalização no cache para IP: ${ip}`);
    
    const cacheData = {
      ip: ip,
      country: geoData.country || null,
      country_code: geoData.countryCode || null,
      region: geoData.region || null,
      region_code: geoData.regionCode || null,
      city: geoData.city || null,
      latitude: geoData.lat || geoData.latitude || null,
      longitude: geoData.lon || geoData.longitude || null,
      timezone: geoData.timezone || null,
      isp: geoData.isp || null,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
    };
    
    const { data, error } = await supabase
      .from('ip_geo_cache')
      .upsert(cacheData, { onConflict: 'ip' })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ [CACHE] Erro ao salvar no cache:`, error);
      return false;
    }
    
    console.log(`✅ [CACHE] Geolocalização salva no cache com sucesso para ${ip}`);
    return true;
  } catch (error) {
    console.error(`❌ [CACHE] Erro inesperado ao salvar cache:`, error);
    return false;
  }
}

// Função principal de geolocalização (copiada do proxy-server.js)
async function getGeolocation(ip) {
  try {
    console.log(`\n🌍 [GEO] Iniciando geolocalização para IP: ${ip}`);
    
    // Verificar se é IP privado
    if (isPrivateIP(ip)) {
      console.log(`⚠️ [GEO] IP privado detectado: ${ip} - Pulando geolocalização`);
      return null;
    }
    
    // Tentar buscar do cache primeiro
    const cachedGeo = await getGeolocationFromCache(ip);
    if (cachedGeo) {
      console.log(`✅ [GEO] Usando geolocalização do cache para ${ip}`);
      return cachedGeo;
    }
    
    console.log(`🌐 [GEO] Cache miss - Consultando API ip-api.com para ${ip}`);
    
    // Consultar API ip-api.com
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,query`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'CDNProxy/2.0 (https://cdnproxy.top)'
      }
    });
    
    console.log(`📡 [GEO] Resposta da API ip-api.com:`, response.data);
    
    if (response.data && response.data.status === 'success') {
      const geoData = {
        country: response.data.country,
        countryCode: response.data.countryCode,
        region: response.data.regionName,
        regionCode: response.data.region,
        city: response.data.city,
        latitude: response.data.lat,
        longitude: response.data.lon,
        timezone: response.data.timezone,
        isp: response.data.isp
      };
      
      console.log(`✅ [GEO] Geolocalização obtida com sucesso da API para ${ip}`);
      
      // Salvar no cache
      const saved = await saveGeolocationToCache(ip, geoData);
      if (saved) {
        console.log(`💾 [GEO] Geolocalização salva no cache para ${ip}`);
      } else {
        console.log(`⚠️ [GEO] Falha ao salvar no cache para ${ip}`);
      }
      
      return geoData;
    } else {
      console.log(`❌ [GEO] API retornou erro para ${ip}:`, response.data?.message || 'Erro desconhecido');
      return null;
    }
  } catch (error) {
    console.error(`❌ [GEO] Erro ao obter geolocalização para ${ip}:`, error.message);
    return null;
  }
}

// Função para testar o fluxo completo
async function testGeolocationFlow() {
  console.log('🧪 [TEST] Iniciando teste do fluxo de geolocalização\n');
  
  // Lista de IPs para testar
  const testIPs = [
    '201.182.93.164', // IP que sabemos que existe
    '8.8.8.8',        // Google DNS
    '1.1.1.1',        // Cloudflare DNS
    '170.238.121.42', // IP que vimos nos logs
    '127.0.0.1',      // Localhost (deve ser ignorado)
    '192.168.1.1'     // IP privado (deve ser ignorado)
  ];
  
  for (const ip of testIPs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 [TEST] Testando IP: ${ip}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await getGeolocation(ip);
    
    if (result) {
      console.log(`✅ [TEST] Resultado para ${ip}:`, {
        country: result.country,
        city: result.city,
        isp: result.isp,
        cached: !!result.cached_at
      });
    } else {
      console.log(`❌ [TEST] Nenhum resultado para ${ip}`);
    }
    
    // Aguardar um pouco entre as requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('🧪 [TEST] Teste concluído');
  console.log(`${'='.repeat(60)}`);
}

// Função para verificar estado atual do cache
async function checkCacheState() {
  console.log('\n📊 [CACHE] Verificando estado atual do cache...\n');
  
  try {
    const { data, error } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .order('cached_at', { ascending: false });
    
    if (error) {
      console.error('❌ [CACHE] Erro ao buscar cache:', error);
      return;
    }
    
    console.log(`📊 [CACHE] Total de IPs no cache: ${data.length}`);
    
    data.forEach((record, index) => {
      const isExpired = new Date(record.expires_at) < new Date();
      console.log(`${index + 1}. IP: ${record.ip}`);
      console.log(`   País: ${record.country} (${record.country_code})`);
      console.log(`   Cidade: ${record.city}`);
      console.log(`   ISP: ${record.isp}`);
      console.log(`   Cached: ${record.cached_at}`);
      console.log(`   Expires: ${record.expires_at} ${isExpired ? '(EXPIRADO)' : '(VÁLIDO)'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ [CACHE] Erro inesperado:', error);
  }
}

// Executar testes
async function main() {
  console.log('🚀 [DEBUG] Iniciando debug do fluxo de geolocalização\n');
  
  // Primeiro, verificar o estado atual do cache
  await checkCacheState();
  
  // Depois, testar o fluxo completo
  await testGeolocationFlow();
  
  // Verificar o cache novamente após os testes
  console.log('\n📊 [CACHE] Estado do cache após os testes:');
  await checkCacheState();
}

main().catch(console.error);