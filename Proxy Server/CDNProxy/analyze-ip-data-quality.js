const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeIPDataQuality() {
  console.log('🕵️  ANÁLISE DA QUALIDADE DOS DADOS DE IP');
  console.log('======================================\n');

  try {
    // 1. Obter todos os dados da tabela ip_geo_cache
    console.log('📊 1. ANALISANDO TODOS OS IPs NA CACHE:');
    console.log('=====================================\n');

    const { data: allIPs, error: allIPsError } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .order('created_at', { ascending: false });

    if (allIPsError) {
      console.error('❌ Erro ao obter dados:', allIPsError);
      return;
    }

    console.log(`📈 Total de IPs na cache: ${allIPs.length}\n`);

    // 2. Análise detalhada de cada IP
    allIPs.forEach((record, index) => {
      console.log(`🔍 IP ${index + 1}: ${record.ip}`);
      console.log('-'.repeat(40));
      
      // Dados básicos
      console.log(`📍 Localização: ${record.city}, ${record.region}, ${record.country}`);
      console.log(`🌐 Coordenadas: ${record.latitude}, ${record.longitude}`);
      console.log(`🏢 ISP: ${record.isp}`);
      console.log(`🕒 Timezone: ${record.timezone}`);
      console.log(`📅 Criado em: ${record.created_at}`);
      console.log(`💾 Cache em: ${record.cached_at}`);
      console.log(`⏰ Expira em: ${record.expires_at}`);

      // Análise da qualidade dos dados
      const qualityChecks = {
        hasCountry: record.country && record.country !== 'Unknown' && record.country !== 'Local',
        hasCity: record.city && record.city !== 'Unknown' && record.city !== 'Local',
        hasISP: record.isp && record.isp !== 'Unknown' && record.isp !== 'Local Network',
        hasValidCoords: record.latitude !== 0 && record.longitude !== 0,
        hasTimezone: record.timezone && record.timezone !== 'UTC',
        hasRegion: record.region && record.region !== 'Unknown' && record.region !== 'Local Network'
      };

      const qualityScore = Object.values(qualityChecks).filter(Boolean).length;
      const maxScore = Object.keys(qualityChecks).length;

      console.log(`\n📊 ANÁLISE DE QUALIDADE:`);
      console.log(`  ✅ País válido: ${qualityChecks.hasCountry ? 'SIM' : 'NÃO'}`);
      console.log(`  ✅ Cidade válida: ${qualityChecks.hasCity ? 'SIM' : 'NÃO'}`);
      console.log(`  ✅ ISP válido: ${qualityChecks.hasISP ? 'SIM' : 'NÃO'}`);
      console.log(`  ✅ Coordenadas válidas: ${qualityChecks.hasValidCoords ? 'SIM' : 'NÃO'}`);
      console.log(`  ✅ Timezone válido: ${qualityChecks.hasTimezone ? 'SIM' : 'NÃO'}`);
      console.log(`  ✅ Região válida: ${qualityChecks.hasRegion ? 'SIM' : 'NÃO'}`);
      console.log(`  📈 Score de qualidade: ${qualityScore}/${maxScore} (${Math.round(qualityScore/maxScore*100)}%)`);

      // Classificação dos dados
      let dataClassification;
      if (qualityScore >= 5) {
        dataClassification = '🟢 DADOS REAIS/COMPLETOS';
      } else if (qualityScore >= 3) {
        dataClassification = '🟡 DADOS PARCIAIS';
      } else {
        dataClassification = '🔴 DADOS FICTÍCIOS/INCOMPLETOS';
      }
      console.log(`  🏷️  Classificação: ${dataClassification}`);

      // Análise temporal
      const createdTime = new Date(record.created_at);
      const cachedTime = new Date(record.cached_at);
      const timeDiff = cachedTime - createdTime;
      
      console.log(`\n⏱️  ANÁLISE TEMPORAL:`);
      console.log(`  📅 Criado: ${createdTime.toISOString()}`);
      console.log(`  💾 Cached: ${cachedTime.toISOString()}`);
      console.log(`  ⏰ Diferença: ${timeDiff}ms`);
      console.log(`  🤖 Tipo de inserção: ${timeDiff < 2000 ? 'AUTOMÁTICA (API)' : 'MANUAL/LENTA'}`);

      // Destaque especial para o IP investigado
      if (record.ip === '201.182.93.164') {
        console.log(`\n🎯 ESTE É O IP QUE ESTAMOS INVESTIGANDO!`);
        console.log(`🔍 ANÁLISE ESPECIAL:`);
        
        // Verificar se os dados são consistentes com uma API real
        if (record.country === 'Brazil' && record.city && record.latitude && record.longitude) {
          console.log(`  ✅ Dados consistentes com localização brasileira`);
          console.log(`  📍 Localização específica: ${record.city}, ${record.region}`);
          console.log(`  🌐 Coordenadas: ${record.latitude}, ${record.longitude}`);
          console.log(`  🏢 ISP: ${record.isp}`);
          console.log(`  ⭐ CONCLUSÃO: Dados parecem ter vindo de uma API de geolocalização real`);
        } else {
          console.log(`  ❌ Dados inconsistentes ou fictícios`);
        }

        // Verificar se foi inserido pelo proxy-server.js
        if (timeDiff < 1000) {
          console.log(`  🤖 INSERÇÃO AUTOMÁTICA: Provavelmente inserido pelo proxy-server.js`);
        } else {
          console.log(`  👤 INSERÇÃO MANUAL: Pode ter sido inserido manualmente ou por outro processo`);
        }
      }

      console.log('\n' + '='.repeat(60) + '\n');
    });

    // 3. Resumo geral
    console.log('📊 RESUMO GERAL DA ANÁLISE:');
    console.log('==========================\n');

    const realDataIPs = allIPs.filter(ip => {
      const hasRealData = ip.country && ip.city && ip.isp && 
                         ip.latitude !== 0 && ip.longitude !== 0 &&
                         ip.country !== 'Unknown' && ip.city !== 'Unknown' &&
                         ip.country !== 'Local' && ip.city !== 'Local';
      return hasRealData;
    });

    const ficticiousIPs = allIPs.filter(ip => {
      const hasRealData = ip.country && ip.city && ip.isp && 
                         ip.latitude !== 0 && ip.longitude !== 0 &&
                         ip.country !== 'Unknown' && ip.city !== 'Unknown' &&
                         ip.country !== 'Local' && ip.city !== 'Local';
      return !hasRealData;
    });

    console.log(`✅ IPs com dados reais: ${realDataIPs.length}`);
    console.log(`❌ IPs com dados fictícios: ${ficticiousIPs.length}`);
    console.log(`📈 Percentual de dados reais: ${Math.round(realDataIPs.length/allIPs.length*100)}%`);

    console.log(`\n🟢 IPs com dados reais:`);
    realDataIPs.forEach(ip => {
      console.log(`  - ${ip.ip}: ${ip.city}, ${ip.country} (${ip.isp})`);
    });

    console.log(`\n🔴 IPs com dados fictícios:`);
    ficticiousIPs.forEach(ip => {
      console.log(`  - ${ip.ip}: ${ip.city || 'N/A'}, ${ip.country || 'N/A'} (${ip.isp || 'N/A'})`);
    });

    // 4. Verificar se o IP 201.182.93.164 está sendo registrado corretamente
    const targetIP = allIPs.find(ip => ip.ip === '201.182.93.164');
    
    console.log(`\n🎯 ANÁLISE ESPECÍFICA DO IP 201.182.93.164:`);
    console.log('==========================================');
    
    if (targetIP) {
      console.log(`✅ IP encontrado na cache`);
      console.log(`📊 Qualidade dos dados: ${targetIP.country && targetIP.city && targetIP.isp ? 'ALTA' : 'BAIXA'}`);
      console.log(`🤖 Inserção: ${new Date(targetIP.cached_at) - new Date(targetIP.created_at) < 2000 ? 'AUTOMÁTICA' : 'MANUAL'}`);
      console.log(`📍 Localização: ${targetIP.city}, ${targetIP.region}, ${targetIP.country}`);
      console.log(`🏢 ISP: ${targetIP.isp}`);
      
      if (targetIP.country === 'Brazil' && targetIP.city && targetIP.latitude && targetIP.longitude) {
        console.log(`✅ CONCLUSÃO: O IP foi registrado corretamente com dados reais da API`);
        console.log(`🔍 PROBLEMA IDENTIFICADO: O proxy-server.js ESTÁ funcionando para este IP`);
        console.log(`❓ INVESTIGAR: Por que outros IPs não estão sendo registrados?`);
      }
    } else {
      console.log(`❌ IP NÃO encontrado na cache`);
      console.log(`🔍 PROBLEMA: O IP não foi registrado pelo proxy-server.js`);
    }

    console.log(`\n🔧 PRÓXIMAS AÇÕES RECOMENDADAS:`);
    console.log(`1. Analisar o código do proxy-server.js`);
    console.log(`2. Verificar logs de erro do proxy-server`);
    console.log(`3. Testar inserção de novos IPs manualmente`);
    console.log(`4. Verificar se há problemas na API de geolocalização`);

  } catch (error) {
    console.error('❌ Erro na análise:', error);
  }
}

// Executar análise
analyzeIPDataQuality();