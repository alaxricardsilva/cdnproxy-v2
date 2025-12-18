const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function createSuperAdmin() {
  try {
    console.log('🚀 Iniciando criação do usuário SUPERADMIN...')
    
    // Configurar cliente Supabase
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
      status: 'ACTIVE'  // Valores válidos: ACTIVE, INACTIVE, SUSPENDED
    }
    
    console.log('👤 Verificando se usuário já existe...')
    
    // Verificar se já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', adminData.email)
      .single()
    
    if (existingUser) {
      console.log('⚠️  Usuário já existe:', adminData.email)
      return
    }
    
    console.log('🔐 Criando usuário no Supabase Auth...')
    
    // Criar usuário no Supabase Auth
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true
    })
    
    if (createAuthError) {
      throw new Error(`Erro ao criar usuário no Auth: ${createAuthError.message}`)
    }
    
    console.log('✅ Usuário criado no Auth:', authUser.user.id)
    
    console.log('💾 Salvando dados do usuário na tabela users...')
    
    // Criar registro na tabela users com password_hash obrigatório
    const bcrypt = require('bcrypt')
    const hashedPassword = await bcrypt.hash(adminData.password, 10)
    
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: adminData.email,
        name: adminData.name,
        role: adminData.role,
        company: adminData.company,
        status: adminData.status,
        password_hash: hashedPassword,
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Erro ao inserir usuário na tabela:', insertError)
      
      // Tentar deletar o usuário do Auth se falhou na inserção
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Erro ao salvar usuário: ${insertError.message}`)
    }
    
    console.log('🎉 SUPERADMIN criado com sucesso!')
    console.log('📧 Email:', adminData.email)
    console.log('🔑 Senha:', adminData.password)
    console.log('👑 Role:', adminData.role)
    console.log('')
    console.log('🌐 Agora você pode fazer login em: http://localhost:3000/auth/login')
    
  } catch (error) {
    console.error('❌ Erro ao criar SUPERADMIN:', error.message)
    process.exit(1)
  }
}

// Executar script
createSuperAdmin()