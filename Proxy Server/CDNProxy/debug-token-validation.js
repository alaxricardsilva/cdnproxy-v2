const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Configurações do ambiente
const SUPABASE_URL = 'https://jyconxalcfqvqakrswnb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MzMyMzksImV4cCI6MjA3NDAwOTIzOX0.B9i9S1n9TxkeM3BHtuq1ZWs_25bugb92YkliWmCS7ok';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';
const JWT_SECRET = '4FazpPqcN8GhtgZ2PzVhCsAiKni/HW+bHNii9lLEsYj3ZRAsAxVbtzu7tOiQeWYy/jrSRtAHLno06ZnXfXLXfA==';

// Criar clientes Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugTokenValidation() {
  console.log('🔍 INICIANDO DEBUG DA VALIDAÇÃO DE TOKEN');
  console.log('='.repeat(60));
  
  try {
    // 1. Fazer login para obter um token
    console.log('📋 1. Fazendo login para obter token...');
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'alaxricardsilva@gmail.com',
      password: 'Admin123'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      return;
    }
    
    const token = loginData.session.access_token;
    console.log('✅ Token obtido:', token.substring(0, 50) + '...');
    console.log('📋 Token completo length:', token.length);
    
    // 2. Tentar decodificar o token sem verificação
    console.log('\n📋 2. Decodificando token sem verificação...');
    const decoded = jwt.decode(token, { complete: true });
    console.log('📋 Header:', JSON.stringify(decoded.header, null, 2));
    console.log('📋 Payload:', JSON.stringify(decoded.payload, null, 2));
    
    // 3. Tentar verificar com JWT_SECRET local
    console.log('\n📋 3. Tentando verificar com JWT_SECRET local...');
    try {
      const localVerified = jwt.verify(token, JWT_SECRET);
      console.log('✅ Verificação local bem-sucedida:', localVerified);
    } catch (localError) {
      console.log('❌ Erro na verificação local:', localError.message);
    }
    
    // 4. Verificar com Supabase client
    console.log('\n📋 4. Verificando com Supabase client...');
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (error) {
        console.log('❌ Erro na verificação Supabase:', error.message);
      } else {
        console.log('✅ Usuário Supabase válido:', user.id, user.email);
        console.log('📋 User metadata:', JSON.stringify(user.user_metadata, null, 2));
        
        // 5. Buscar usuário no banco
        console.log('\n📋 5. Buscando usuário no banco...');
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (userError) {
          console.log('❌ Erro ao buscar usuário:', userError.message);
        } else {
          console.log('✅ Usuário encontrado no banco:', userData.email, 'Role:', userData.role);
        }
      }
    } catch (supabaseError) {
      console.log('❌ Erro na verificação Supabase:', supabaseError.message);
    }
    
    // 6. Testar endpoint administrativo
    console.log('\n📋 6. Testando endpoint administrativo...');
    try {
      const response = await fetch('https://api.cdnproxy.top/api/superadmin/system/services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = await response.text();
      console.log('📋 Status da resposta:', response.status);
      console.log('📋 Resposta:', responseText);
      
    } catch (fetchError) {
      console.log('❌ Erro na requisição:', fetchError.message);
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Função para testar diferentes tipos de token
async function testTokenTypes() {
  console.log('\n🔍 TESTANDO DIFERENTES TIPOS DE TOKEN');
  console.log('='.repeat(60));
  
  // Teste 1: Token JWT local
  console.log('\n📋 Teste 1: Criando token JWT local...');
  const localToken = jwt.sign({
    userId: 'admin',
    email: 'admin@local',
    role: 'admin'
  }, JWT_SECRET, { expiresIn: '1h' });
  
  console.log('📋 Token local criado:', localToken.substring(0, 50) + '...');
  
  try {
    const verified = jwt.verify(localToken, JWT_SECRET);
    console.log('✅ Token local verificado:', verified);
  } catch (error) {
    console.log('❌ Erro na verificação do token local:', error.message);
  }
  
  // Teste 2: Verificar se o problema é com o algoritmo
  console.log('\n📋 Teste 2: Verificando algoritmos suportados...');
  const algorithms = ['HS256', 'HS384', 'HS512', 'RS256'];
  
  for (const alg of algorithms) {
    try {
      const testToken = jwt.sign({ test: true }, JWT_SECRET, { algorithm: alg, expiresIn: '1h' });
      const verified = jwt.verify(testToken, JWT_SECRET, { algorithms: [alg] });
      console.log(`✅ Algoritmo ${alg}: OK`);
    } catch (error) {
      console.log(`❌ Algoritmo ${alg}: ${error.message}`);
    }
  }
}

// Executar testes
async function runAllTests() {
  await debugTokenValidation();
  await testTokenTypes();
  
  console.log('\n🎉 DEBUG CONCLUÍDO!');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  debugTokenValidation,
  testTokenTypes
};