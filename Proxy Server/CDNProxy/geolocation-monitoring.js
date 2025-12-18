#!/usr/bin/env node

/**
 * Sistema de Monitoramento de Geolocalização
 * 
 * Este script monitora discrepâncias entre dados de geolocalização
 * em cache e dados atuais das APIs, alertando sobre inconsistências.
 */

const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Configurações do monitoramento
 */
const MONITORING_CONFIG = {
    // Intervalo entre verificações (em milissegundos)
    CHECK_INTERVAL: 60 * 60 * 1000, // 1 hora
    
    // Idade máxima do cache para considerar verificação (em horas)
    MAX_CACHE_AGE_HOURS: 24,
    
    // Número máximo de IPs para verificar por execução
    MAX_IPS_PER_RUN: 10,
    
    // APIs de geolocalização para verificação
    GEOLOCATION_APIS: [
        {
            name: 'ip-api.com',
            url: (ip) => `http://ip-api.com/json/${ip}?fields=status,country,regionName,city`,
            transform: (data) => ({
                country: data.country,
                region: data.regionName,
                city: data.city
            }),
            rateLimit: 45 // requests per minute
        },
        {
            name: 'ipinfo.io',
            url: (ip) => `https://ipinfo.io/${ip}/json`,
            transform: (data) => ({
                country: data.country,
                region: data.region,
                city: data.city
            }),
            rateLimit: 50000 // requests per month
        }
    ]
};

/**
 * Função para obter IPs do cache para monitoramento
 */
async function getIPsForMonitoring() {
    try {
        const { data, error } = await supabase
            .from('ip_geo_cache')
            .select('ip, country, region, city, cached_at')
            .gte('cached_at', new Date(Date.now() - MONITORING_CONFIG.MAX_CACHE_AGE_HOURS * 60 * 60 * 1000).toISOString())
            .order('cached_at', { ascending: true })
            .limit(MONITORING_CONFIG.MAX_IPS_PER_RUN);

        if (error) {
            console.error('❌ Erro ao buscar IPs para monitoramento:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('❌ Erro ao conectar com Supabase:', error);
        return [];
    }
}

/**
 * Função para verificar geolocalização atual de um IP
 */
async function getCurrentGeolocation(ip) {
    const results = [];
    
    for (const api of MONITORING_CONFIG.GEOLOCATION_APIS) {
        try {
            const response = await fetch(api.url(ip));
            const data = await response.json();
            
            if (response.ok && data && data.status !== 'fail') {
                const transformed = api.transform(data);
                results.push({
                    api: api.name,
                    data: transformed,
                    success: true
                });
            } else {
                results.push({
                    api: api.name,
                    error: data.message || 'Erro desconhecido',
                    success: false
                });
            }
        } catch (error) {
            results.push({
                api: api.name,
                error: error.message,
                success: false
            });
        }
        
        // Rate limiting - aguardar entre requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

/**
 * Função para comparar dados de geolocalização
 */
function compareGeolocations(cached, current) {
    const discrepancies = [];
    
    // Verificar se há dados atuais válidos
    const validCurrent = current.filter(r => r.success);
    if (validCurrent.length === 0) {
        return {
            hasDiscrepancy: false,
            reason: 'Nenhuma API atual retornou dados válidos',
            discrepancies: []
        };
    }
    
    // Usar o primeiro resultado válido para comparação
    const currentData = validCurrent[0].data;
    
    // Comparar país
    if (cached.country !== currentData.country) {
        discrepancies.push({
            field: 'country',
            cached: cached.country,
            current: currentData.country
        });
    }
    
    // Comparar região
    if (cached.region !== currentData.region) {
        discrepancies.push({
            field: 'region',
            cached: cached.region,
            current: currentData.region
        });
    }
    
    // Comparar cidade
    if (cached.city !== currentData.city) {
        discrepancies.push({
            field: 'city',
            cached: cached.city,
            current: currentData.city
        });
    }
    
    return {
        hasDiscrepancy: discrepancies.length > 0,
        discrepancies: discrepancies,
        currentData: currentData,
        apiResults: current
    };
}

/**
 * Função para registrar discrepância
 */
async function logDiscrepancy(ip, cachedData, comparison) {
    const logEntry = {
        ip: ip,
        timestamp: new Date().toISOString(),
        cached_data: {
            country: cachedData.country,
            region: cachedData.region,
            city: cachedData.city,
            cached_at: cachedData.cached_at
        },
        current_data: comparison.currentData,
        discrepancies: comparison.discrepancies,
        api_results: comparison.apiResults
    };
    
    console.log(`\n🚨 DISCREPÂNCIA DETECTADA para IP ${ip}:`);
    console.log(`   Cache: ${cachedData.city}, ${cachedData.region}, ${cachedData.country}`);
    console.log(`   Atual: ${comparison.currentData.city}, ${comparison.currentData.region}, ${comparison.currentData.country}`);
    console.log(`   Diferenças:`, comparison.discrepancies.map(d => `${d.field}: ${d.cached} → ${d.current}`).join(', '));
    
    // Salvar log em arquivo
    const fs = require('fs');
    const logFile = 'geolocation-discrepancies.log';
    
    try {
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        console.log(`   📝 Log salvo em ${logFile}`);
    } catch (error) {
        console.error(`   ❌ Erro ao salvar log: ${error.message}`);
    }
}

/**
 * Função principal de monitoramento
 */
async function runMonitoring() {
    console.log(`\n🔍 === Iniciando Monitoramento de Geolocalização ===`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`   Max IPs por execução: ${MONITORING_CONFIG.MAX_IPS_PER_RUN}`);
    console.log(`   Max idade do cache: ${MONITORING_CONFIG.MAX_CACHE_AGE_HOURS}h\n`);
    
    // 1. Obter IPs para monitoramento
    const ipsToCheck = await getIPsForMonitoring();
    
    if (ipsToCheck.length === 0) {
        console.log('ℹ️  Nenhum IP encontrado para monitoramento');
        return;
    }
    
    console.log(`📋 Verificando ${ipsToCheck.length} IPs...\n`);
    
    let discrepanciesFound = 0;
    let totalChecked = 0;
    
    // 2. Verificar cada IP
    for (const cachedIP of ipsToCheck) {
        totalChecked++;
        console.log(`[${totalChecked}/${ipsToCheck.length}] Verificando IP: ${cachedIP.ip}`);
        
        // Obter geolocalização atual
        const currentResults = await getCurrentGeolocation(cachedIP.ip);
        
        // Comparar com dados em cache
        const comparison = compareGeolocations(cachedIP, currentResults);
        
        if (comparison.hasDiscrepancy) {
            discrepanciesFound++;
            await logDiscrepancy(cachedIP.ip, cachedIP, comparison);
        } else {
            console.log(`   ✅ Dados consistentes`);
        }
        
        // Rate limiting entre IPs
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 3. Resumo final
    console.log(`\n📊 === Resumo do Monitoramento ===`);
    console.log(`   IPs verificados: ${totalChecked}`);
    console.log(`   Discrepâncias encontradas: ${discrepanciesFound}`);
    console.log(`   Taxa de consistência: ${((totalChecked - discrepanciesFound) / totalChecked * 100).toFixed(1)}%`);
    
    if (discrepanciesFound > 0) {
        console.log(`   📝 Logs salvos em: geolocation-discrepancies.log`);
    }
}

/**
 * Função para executar monitoramento contínuo
 */
async function startContinuousMonitoring() {
    console.log(`🚀 Iniciando monitoramento contínuo...`);
    console.log(`   Intervalo: ${MONITORING_CONFIG.CHECK_INTERVAL / 1000 / 60} minutos\n`);
    
    // Executar primeira verificação
    await runMonitoring();
    
    // Agendar verificações periódicas
    setInterval(async () => {
        try {
            await runMonitoring();
        } catch (error) {
            console.error('❌ Erro durante monitoramento:', error);
        }
    }, MONITORING_CONFIG.CHECK_INTERVAL);
}

/**
 * Função para verificar um IP específico
 */
async function checkSpecificIP(ip) {
    console.log(`\n🔍 === Verificação Específica do IP: ${ip} ===\n`);
    
    // Buscar dados em cache
    const { data: cachedData, error } = await supabase
        .from('ip_geo_cache')
        .select('*')
        .eq('ip', ip)
        .single();
    
    if (error || !cachedData) {
        console.log('❌ IP não encontrado no cache');
        return;
    }
    
    console.log(`📦 Dados em cache:`);
    console.log(`   Localização: ${cachedData.city}, ${cachedData.region}, ${cachedData.country}`);
    console.log(`   Cached em: ${cachedData.cached_at}`);
    
    // Obter dados atuais
    console.log(`\n🌐 Verificando APIs atuais...`);
    const currentResults = await getCurrentGeolocation(ip);
    
    // Comparar
    const comparison = compareGeolocations(cachedData, currentResults);
    
    if (comparison.hasDiscrepancy) {
        await logDiscrepancy(ip, cachedData, comparison);
    } else {
        console.log(`\n✅ Dados consistentes entre cache e APIs atuais`);
    }
}

// Execução principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Uso:');
        console.log('  node geolocation-monitoring.js run          # Executar uma verificação');
        console.log('  node geolocation-monitoring.js continuous   # Monitoramento contínuo');
        console.log('  node geolocation-monitoring.js check <IP>   # Verificar IP específico');
        process.exit(1);
    }
    
    const command = args[0];
    
    try {
        switch (command) {
            case 'run':
                await runMonitoring();
                break;
            case 'continuous':
                await startContinuousMonitoring();
                break;
            case 'check':
                if (args.length < 2) {
                    console.error('❌ IP não especificado');
                    process.exit(1);
                }
                await checkSpecificIP(args[1]);
                break;
            default:
                console.error('❌ Comando inválido');
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Erro durante execução:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { runMonitoring, checkSpecificIP, compareGeolocations };