#!/usr/bin/env node

/**
 * Verificação Abrangente do Sistema de Cache de IP
 * 
 * Este script verifica:
 * 1. API ip-cache no domínio gf.proxysrv.top
 * 2. Registros no banco de dados (IPv4 e IPv6)
 * 3. Se IP de dados móveis foi registrado automaticamente
 * 4. Suporte a IPv6
 * 5. Exibição no frontend
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Configurações
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseKey);

// URLs para teste
const FRONTEND_URL = 'https://app.cdnproxy.top';
const PROXY_URL = 'https://gf.proxysrv.top';

/**
 * 1. Verificar registros no banco de dados
 */
async function checkDatabaseRecords() {
    console.log('\n🗄️  === VERIFICAÇÃO DO BANCO DE DADOS ===\n');
    
    try {
        // Verificar tabela ip_geo_cache
        const { data: ipCache, error: cacheError, count } = await supabase
            .from('ip_geo_cache')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (cacheError) {
            console.error('❌ Erro ao consultar ip_geo_cache:', cacheError);
            return;
        }
        
        console.log(`📊 Total de IPs no cache: ${count}`);
        
        if (ipCache && ipCache.length > 0) {
            console.log('\n📋 Últimos 10 IPs registrados:');
            
            let ipv4Count = 0;
            let ipv6Count = 0;
            
            ipCache.slice(0, 10).forEach((record, index) => {
                const isIPv6 = record.ip.includes(':');
                if (isIPv6) {
                    ipv6Count++;
                } else {
                    ipv4Count++;
                }
                
                console.log(`   ${index + 1}. ${record.ip} (${isIPv6 ? 'IPv6' : 'IPv4'})`);
                console.log(`      📍 ${record.city}, ${record.region}, ${record.country}`);
                console.log(`      🕒 ${record.created_at}`);
                console.log('');
            });
            
            // Contar todos os IPs por tipo
            const allIPv4 = ipCache.filter(record => !record.ip.includes(':')).length;
            const allIPv6 = ipCache.filter(record => record.ip.includes(':')).length;
            
            console.log(`📈 Estatísticas completas:`);
            console.log(`   IPv4: ${allIPv4} registros`);
            console.log(`   IPv6: ${allIPv6} registros`);
            console.log(`   Total: ${allIPv4 + allIPv6} registros`);
            
            // Verificar se há suporte a IPv6
            if (allIPv6 > 0) {
                console.log('✅ Sistema reconhece e processa IPv6 corretamente');
            } else {
                console.log('⚠️  Nenhum registro IPv6 encontrado no cache');
            }
        } else {
            console.log('⚠️  Nenhum registro encontrado no cache');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar banco de dados:', error);
    }
}

/**
 * 2. Obter IP atual do usuário
 */
async function getCurrentUserIP() {
    console.log('\n🌐 === DETECÇÃO DO IP ATUAL ===\n');
    
    try {
        // Tentar múltiplas APIs para obter o IP
        const ipAPIs = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/json/',
            'https://ip-api.com/json/'
        ];
        
        for (const apiUrl of ipAPIs) {
            try {
                console.log(`🔍 Consultando: ${apiUrl}`);
                const response = await axios.get(apiUrl, { timeout: 5000 });
                
                let ip = null;
                if (response.data.ip) {
                    ip = response.data.ip;
                } else if (response.data.query) {
                    ip = response.data.query;
                }
                
                if (ip) {
                    const isIPv6 = ip.includes(':');
                    console.log(`✅ IP detectado: ${ip} (${isIPv6 ? 'IPv6' : 'IPv4'})`);
                    
                    if (response.data.country || response.data.country_name) {
                        const country = response.data.country || response.data.country_name;
                        const city = response.data.city || 'N/A';
                        const region = response.data.region || response.data.regionName || 'N/A';
                        console.log(`📍 Localização: ${city}, ${region}, ${country}`);
                    }
                    
                    return ip;
                }
            } catch (error) {
                console.log(`❌ Falha em ${apiUrl}: ${error.message}`);
            }
        }
        
        console.log('❌ Não foi possível detectar o IP atual');
        return null;
        
    } catch (error) {
        console.error('❌ Erro ao obter IP atual:', error);
        return null;
    }
}

/**
 * 3. Verificar se IP está no cache
 */
async function checkIPInCache(ip) {
    console.log(`\n🔍 === VERIFICAÇÃO DO IP NO CACHE: ${ip} ===\n`);
    
    try {
        const { data, error } = await supabase
            .from('ip_geo_cache')
            .select('*')
            .eq('ip', ip)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('❌ Erro ao consultar cache:', error);
            return false;
        }
        
        if (data) {
            console.log('✅ IP encontrado no cache!');
            console.log(`📍 Localização: ${data.city}, ${data.region}, ${data.country}`);
            console.log(`🕒 Cached em: ${data.created_at}`);
            console.log(`⏰ Expira em: ${data.expires_at || 'N/A'}`);
            return true;
        } else {
            console.log('❌ IP não encontrado no cache');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar IP no cache:', error);
        return false;
    }
}

/**
 * 4. Testar proxy server para registrar IP automaticamente
 */
async function testProxyServerRegistration(ip) {
    console.log(`\n🔄 === TESTE DE REGISTRO AUTOMÁTICO VIA PROXY ===\n`);
    
    try {
        console.log(`🌐 Fazendo requisição para: ${PROXY_URL}`);
        console.log(`📡 IP esperado: ${ip}`);
        
        // Fazer requisição para o proxy server
        const response = await axios.get(PROXY_URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'CDNProxy-Test/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        console.log(`✅ Requisição bem-sucedida (Status: ${response.status})`);
        
        // Aguardar um pouco para o processamento
        console.log('⏳ Aguardando processamento (5 segundos)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verificar se o IP foi registrado
        const wasRegistered = await checkIPInCache(ip);
        
        if (wasRegistered) {
            console.log('🎉 IP foi registrado automaticamente no cache!');
        } else {
            console.log('⚠️  IP não foi registrado automaticamente');
            console.log('   Possíveis causas:');
            console.log('   - IP pode estar sendo mascarado por proxy/CDN');
            console.log('   - Sistema pode estar filtrando este tipo de IP');
            console.log('   - Delay no processamento');
        }
        
        return wasRegistered;
        
    } catch (error) {
        console.error('❌ Erro ao testar proxy server:', error.message);
        return false;
    }
}

/**
 * 5. Verificar APIs do sistema
 */
async function checkSystemAPIs() {
    console.log('\n🔌 === VERIFICAÇÃO DAS APIs DO SISTEMA ===\n');
    
    // Testar API de geolocalização direta
    try {
        console.log('🧪 Testando API de geolocalização...');
        const testIP = '8.8.8.8';
        
        const response = await axios.get(`${PROXY_URL}/api/geolocation?ip=${testIP}`, {
            timeout: 5000
        });
        
        console.log('✅ API de geolocalização funcionando');
        console.log(`📍 Teste com ${testIP}:`, response.data);
        
    } catch (error) {
        console.log('❌ API de geolocalização não acessível:', error.message);
    }
    
    // Testar frontend
    try {
        console.log('\n🖥️  Testando frontend...');
        const response = await axios.get(FRONTEND_URL, {
            timeout: 5000,
            headers: {
                'User-Agent': 'CDNProxy-Test/1.0'
            }
        });
        
        console.log(`✅ Frontend acessível (Status: ${response.status})`);
        
        // Verificar se contém referências ao sistema de cache
        const content = response.data.toLowerCase();
        if (content.includes('geolocation') || content.includes('ip') || content.includes('cache')) {
            console.log('✅ Frontend parece ter funcionalidades de geolocalização');
        }
        
    } catch (error) {
        console.log('❌ Frontend não acessível:', error.message);
    }
}

/**
 * 6. Testar IPs IPv6 específicos
 */
async function testIPv6Support() {
    console.log('\n🌐 === TESTE DE SUPORTE IPv6 ===\n');
    
    const ipv6TestIPs = [
        '2001:4860:4860::8888', // Google DNS IPv6
        '2606:4700:4700::1111', // Cloudflare DNS IPv6
    ];
    
    for (const testIP of ipv6TestIPs) {
        try {
            console.log(`🧪 Testando IPv6: ${testIP}`);
            
            // Verificar se já está no cache
            const inCache = await checkIPInCache(testIP);
            
            if (!inCache) {
                console.log('   📡 Tentando obter geolocalização...');
                
                // Tentar obter geolocalização via API
                try {
                    const response = await axios.get(`http://ip-api.com/json/${testIP}`, {
                        timeout: 5000
                    });
                    
                    if (response.data && response.data.status === 'success') {
                        console.log('   ✅ Geolocalização IPv6 obtida com sucesso');
                        console.log(`   📍 ${response.data.city}, ${response.data.regionName}, ${response.data.country}`);
                    } else {
                        console.log('   ⚠️  API não retornou dados válidos para IPv6');
                    }
                } catch (error) {
                    console.log('   ❌ Erro ao obter geolocalização IPv6:', error.message);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Erro ao testar ${testIP}:`, error.message);
        }
    }
}

/**
 * 7. Relatório final
 */
async function generateFinalReport(userIP, wasRegistered) {
    console.log('\n📊 === RELATÓRIO FINAL ===\n');
    
    // Estatísticas do banco
    const { count } = await supabase
        .from('ip_geo_cache')
        .select('*', { count: 'exact', head: true });
    
    const { data: ipv4Records } = await supabase
        .from('ip_geo_cache')
        .select('ip')
        .not('ip', 'like', '%:%');
    
    const { data: ipv6Records } = await supabase
        .from('ip_geo_cache')
        .select('ip')
        .like('ip', '%:%');
    
    console.log('📈 Estatísticas do Sistema:');
    console.log(`   Total de IPs em cache: ${count || 0}`);
    console.log(`   IPs IPv4: ${ipv4Records?.length || 0}`);
    console.log(`   IPs IPv6: ${ipv6Records?.length || 0}`);
    
    console.log('\n🔍 Verificações Realizadas:');
    console.log(`   ✅ Banco de dados verificado`);
    console.log(`   ✅ IP atual detectado: ${userIP || 'N/A'}`);
    console.log(`   ${wasRegistered ? '✅' : '❌'} Registro automático: ${wasRegistered ? 'Funcionando' : 'Não funcionou'}`);
    console.log(`   ${(ipv6Records?.length || 0) > 0 ? '✅' : '⚠️ '} Suporte IPv6: ${(ipv6Records?.length || 0) > 0 ? 'Ativo' : 'Sem registros'}`);
    
    console.log('\n🌐 URLs Testadas:');
    console.log(`   Frontend: ${FRONTEND_URL}`);
    console.log(`   Proxy: ${PROXY_URL}`);
    
    console.log('\n💡 Recomendações:');
    if (!wasRegistered && userIP) {
        console.log('   - Verificar se o proxy server está processando IPs corretamente');
        console.log('   - Confirmar se não há filtros bloqueando o registro');
    }
    
    if ((ipv6Records?.length || 0) === 0) {
        console.log('   - Considerar testar com conexões IPv6 reais');
        console.log('   - Verificar se o sistema está preparado para IPv6');
    }
    
    console.log('\n✨ Verificação concluída!');
}

/**
 * Função principal
 */
async function main() {
    console.log('🚀 === VERIFICAÇÃO ABRANGENTE DO SISTEMA DE CACHE DE IP ===');
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`   Frontend: ${FRONTEND_URL}`);
    console.log(`   Proxy: ${PROXY_URL}\n`);
    
    try {
        // 1. Verificar registros no banco
        await checkDatabaseRecords();
        
        // 2. Obter IP atual
        const userIP = await getCurrentUserIP();
        
        // 3. Verificar se IP atual está no cache
        let wasRegistered = false;
        if (userIP) {
            const inCache = await checkIPInCache(userIP);
            
            // 4. Se não estiver no cache, testar registro automático
            if (!inCache) {
                wasRegistered = await testProxyServerRegistration(userIP);
            } else {
                wasRegistered = true;
            }
        }
        
        // 5. Verificar APIs do sistema
        await checkSystemAPIs();
        
        // 6. Testar suporte IPv6
        await testIPv6Support();
        
        // 7. Gerar relatório final
        await generateFinalReport(userIP, wasRegistered);
        
    } catch (error) {
        console.error('❌ Erro durante verificação:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}