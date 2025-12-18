const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './backend/.env.production' })

async function checkIpCache() {
  console.log('🔍 Verificando cache de IPs no Supabase...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente do Supabase não encontradas')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Verificar todos os IPs no cache
    console.log('📋 Consultando tabela ip_geo_cache...')
    
    const { data: allIps, error: allError } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ Erro ao consultar ip_geo_cache:', allError)
      return
    }
    
    console.log(`✅ Total de IPs no cache: ${allIps?.length || 0}`)
    
    if (allIps && allIps.length > 0) {
      console.log('📊 IPs encontrados:')
      allIps.forEach((ip, index) => {
        console.log(`${index + 1}. ${ip.ip} - ${ip.city}, ${ip.country} (${ip.created_at})`)
      })
    }
    
    // Verificar especificamente o IP 201.182.93.164
    console.log('🎯 Verificando IP específico: 201.182.93.164')
    
    const { data: specificIp, error: specificError } = await supabase
      .from('ip_geo_cache')
      .select('*')
      .eq('ip', '201.182.93.164')
      .single()
    
    if (specificError) {
      if (specificError.code === 'PGRST116') {
        console.log('❌ IP 201.182.93.164 NÃO encontrado no cache')
      } else {
        console.error('❌ Erro ao consultar IP específico:', specificError)
      }
      return
    }
    
    console.log('✅ IP 201.182.93.164 ENCONTRADO no cache!')
    console.log('📍 Dados de geolocalização:')
    console.log(`   País: ${specificIp.country} (${specificIp.country_code})`)
    console.log(`   Região: ${specificIp.region}`)
    console.log(`   Cidade: ${specificIp.city}`)
    console.log(`   ISP: ${specificIp.isp}`)
    console.log(`   Criado em: ${specificIp.created_at}`)
    
    // Verificar logs de acesso
    console.log('📝 Verificando logs de acesso...')
    
    const { data: accessLogs, error: logsError } = await supabase
      .from('access_logs')
      .select('*')
      .eq('client_ip', '201.182.93.164')
      .order('access_timestamp', { ascending: false })
    
    if (logsError) {
      console.error('❌ Erro ao consultar access_logs:', logsError)
      return
    }
    
    console.log(`✅ Total de logs de acesso para IP 201.182.93.164: ${accessLogs?.length || 0}`)
    
    if (accessLogs && accessLogs.length > 0) {
      console.log('📊 Logs de acesso encontrados:')
      accessLogs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.domain}${log.path} - ${log.method} ${log.status_code} (${log.access_timestamp})`)
      })
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err)
  }
}

checkIpCache()