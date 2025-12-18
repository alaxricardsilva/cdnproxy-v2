const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcrypt')
require('dotenv').config()

async function createSuperAdminDirect() {
  try {
    console.log('🚀 Iniciando criação do usuário SUPERADMIN...')
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
    }
    
    console.log('📡 Conectando ao Supabase:', supabaseUrl)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Dados do usuário SUPERADMIN
    const adminData = {
      email: 'admin@proxycdn.com',
      password: 'Admin123!',
      name: 'Super Administrator',
      role: 'SUPERADMIN',
      company: 'ProxyCDN',
      status: 'ACTIVE'
    }
    
    // Verificar se o usuário já existe
    console.log('🔍 Verificando se o usuário já existe...')
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .eq('email', adminData.email)
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️  Usuário já existe:', adminData.email)
      return
    }
    
    // Criar usuário no Supabase Auth
    console.log('👤 Criando usuário no Supabase Auth...')
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true
    })
    
    if (createAuthError) {
      throw new Error(`Erro ao criar usuário no Auth: ${createAuthError.message}`)
    }
    
    console.log('✅ Usuário criado no Auth:', authUser.user.id)
    
    // Gerar hash da senha
    console.log('🔐 Gerando hash da senha...')
    const passwordHash = await bcrypt.hash(adminData.password, 12)
    
    // Inserir na tabela users com password_hash e campos obrigatórios
    console.log('💾 Salvando perfil do usuário...')
    const { data: newUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: adminData.email,
        name: adminData.name,
        role: adminData.role,
        company: adminData.company,
        status: 'active',  // Deve ser minúsculo
        plan: 'basic',
        plan_status: 'active',
        plan_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
        subscription_status: 'active',
        country: 'Brasil',
        password_hash: passwordHash,
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (createUserError) {
      console.error('❌ Erro ao criar usuário na tabela:', createUserError)
      // Limpar usuário do Auth se falhar
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Erro ao salvar perfil: ${createUserError.message}`)
    }
    
    console.log('🎉 SUPERADMIN criado com sucesso!')
    console.log('📧 Email:', adminData.email)
    console.log('🔑 Senha:', adminData.password)
    console.log('👑 Role:', adminData.role)
    console.log('🆔 ID:', authUser.user.id)
    
    console.log('')
    console.log('🌐 Agora você pode fazer login em: http://localhost:3000/auth/login')
    
  } catch (error) {
    console.error('❌ Erro ao criar SUPERADMIN:', error.message)
    process.exit(1)
  }
}

// Executar script
createSuperAdminDirect()