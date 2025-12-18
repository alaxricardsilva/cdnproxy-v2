const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Configurações:');
console.log('SUPABASE_URL:', supabaseUrl ? 'definida' : 'não definida');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'definida' : 'não definida');

// Criar cliente Supabase admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSupabaseToken() {
  try {
    // Primeiro, verificar se já existe um usuário admin
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }

    let adminUser = existingUsers.users.find(user => user.email === 'alaxricardsilva@outlook.com');

    if (!adminUser) {
      // Criar um usuário admin
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'alaxricardsilva@outlook.com',
        password: 'Admin123',
        email_confirm: true,
        user_metadata: {
          role: 'ADMIN',
          name: 'Admin'
        }
      });

      if (authError) {
        console.error('❌ Erro ao criar usuário:', authError);
        return;
      }

      adminUser = authData.user;
      console.log('✅ Usuário admin criado:', adminUser.id);
    } else {
      console.log('✅ Usuário admin encontrado:', adminUser.id);
    }

    // Inserir/atualizar dados do usuário na tabela users
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: adminUser.id,
        email: adminUser.email,
        name: 'Admin',
        role: 'ADMIN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.log('⚠️ Aviso ao inserir na tabela users:', upsertError.message);
    } else {
      console.log('✅ Dados do usuário inseridos na tabela users');
    }

    // Gerar token de acesso usando o Service Role Key
    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
      sub: adminUser.id,
      email: adminUser.email,
      phone: '',
      app_metadata: {
        provider: 'email',
        providers: ['email']
      },
      user_metadata: {
        role: 'ADMIN',
        name: 'Admin'
      },
      role: 'authenticated'
    };

    // Usar o JWT secret do Supabase
    const supabaseJwtSecret = process.env.JWT_SECRET;
    if (!supabaseJwtSecret) {
      console.error('❌ JWT_SECRET não encontrado no .env');
      return;
    }
    
    const token = jwt.sign(payload, supabaseJwtSecret);

    console.log('✅ Token Supabase gerado:');
    console.log(token);
    
    // Verificar o token
    const { data: userData, error: verifyError } = await supabase.auth.getUser(token);
    
    if (verifyError) {
      console.error('❌ Erro ao verificar token:', verifyError);
    } else {
      console.log('✅ Token verificado com sucesso:', userData.user.email);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

createSupabaseToken();