#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugDomainValidation() {
  console.log('🔍 Debugando validação de domínios...\n');

  try {
    // 1. Listar todos os domínios
    console.log('📋 Listando todos os domínios:');
    const { data: allDomains, error: allDomainsError } = await supabase
      .from('domains')
      .select('*')
      .order('created_at', { ascending: false });

    if (allDomainsError) {
      console.error('❌ Erro ao buscar domínios:', allDomainsError);
      return;
    }

    console.log(`   Total de domínios: ${allDomains?.length || 0}`);
    
    if (allDomains && allDomains.length > 0) {
      console.log('\n📋 Primeiros 10 domínios:');
      allDomains.slice(0, 10).forEach((domain, index) => {
        console.log(`   ${index + 1}. ID: ${domain.id} | Domínio: ${domain.domain} | User ID: ${domain.user_id}`);
      });
    }

    // 2. Buscar usuários admin
    console.log('\n👥 Buscando usuários admin:');
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('*')
      .in('role', ['ADMIN', 'SUPERADMIN'])
      .order('created_at', { ascending: false });

    if (adminError) {
      console.error('❌ Erro ao buscar usuários admin:', adminError);
    } else {
      console.log(`   Total de admins: ${adminUsers?.length || 0}`);
      
      if (adminUsers && adminUsers.length > 0) {
        adminUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id} | Email: ${user.email} | Role: ${user.role}`);
        });
      }
    }

    // 3. Testar validação com domínio específico
    console.log('\n🧪 Testando validação de domínio específico:');
    
    // Usar o primeiro domínio disponível para teste
    if (allDomains && allDomains.length > 0) {
      const testDomainId = allDomains[0].id;
      const testUserId = allDomains[0].user_id;
      
      console.log(`   Testando com domínio ID: ${testDomainId}`);
      console.log(`   User ID do domínio: ${testUserId}`);
      
      // Simular a query da API
      let domainQuery = supabase
        .from('domains')
        .select('*')
        .in('id', [testDomainId]);

      // Aplicar filtro de user_id se for UUID válido
      if (testUserId !== 'admin' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testUserId)) {
        console.log('   ✅ Aplicando filtro de user_id (UUID válido)');
        domainQuery = domainQuery.eq('user_id', testUserId);
      } else {
        console.log('   ⚠️ Não aplicando filtro de user_id (não é UUID válido ou é admin)');
      }

      const { data: testDomains, error: testError } = await domainQuery;

      if (testError) {
        console.error('   ❌ Erro na query de teste:', testError);
      } else {
        console.log(`   ✅ Domínios encontrados: ${testDomains?.length || 0}`);
        if (testDomains && testDomains.length > 0) {
          testDomains.forEach(domain => {
            console.log(`      - ${domain.domain} (ID: ${domain.id})`);
          });
        }
      }
    }

    // 4. Verificar planos disponíveis
    console.log('\n📦 Verificando planos disponíveis:');
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (plansError) {
      console.error('❌ Erro ao buscar planos:', plansError);
    } else {
      console.log(`   Total de planos: ${plans?.length || 0}`);
      
      if (plans && plans.length > 0) {
        console.log('\n📋 Planos disponíveis:');
        plans.forEach((plan, index) => {
          console.log(`   ${index + 1}. ID: ${plan.id} | Nome: ${plan.name} | Preço: R$ ${plan.price}`);
        });
      }
    }

    console.log('\n🎯 Conclusão:');
    console.log('Para corrigir o erro 404 "Domínios não encontrados", verifique:');
    console.log('1. Se o domain_id enviado existe na tabela domains');
    console.log('2. Se o user_id do token corresponde ao user_id do domínio');
    console.log('3. Se o usuário tem permissão para acessar o domínio');

  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  }
}

// Executar debug
debugDomainValidation();