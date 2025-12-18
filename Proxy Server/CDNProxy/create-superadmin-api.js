const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function createSuperAdminViaAPI() {
  try {
    console.log('🚀 Iniciando criação do usuário SUPERADMIN via API...')
    
    // Configurar cliente Supabase para criar um token temporário
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
    }
    
    console.log('📡 Conectando ao Supabase:', supabaseUrl)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Primeiro, criar um usuário temporário para obter um token válido
    console.log('🔐 Criando usuário temporário para autenticação...')
    
    const tempUserData = {
      email: 'temp-admin@proxycdn.com',
      password: 'TempAdmin123!',
      role: 'SUPERADMIN'
    }
    
    // Criar usuário temporário no Auth
    const { data: tempAuthUser, error: tempAuthError } = await supabase.auth.admin.createUser({
      email: tempUserData.email,
      password: tempUserData.password,
      email_confirm: true
    })
    
    if (tempAuthError) {
      throw new Error(`Erro ao criar usuário temporário: ${tempAuthError.message}`)
    }
    
    // Criar registro temporário na tabela users (mínimo necessário)
    const { error: tempInsertError } = await supabase
      .from('users')
      .insert({
        id: tempAuthUser.user.id,
        email: tempUserData.email,
        name: 'Temp Admin',
        role: tempUserData.role,
        status: 'ACTIVE',
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (tempInsertError) {
      console.error('❌ Erro ao criar usuário temporário na tabela:', tempInsertError)
      await supabase.auth.admin.deleteUser(tempAuthUser.user.id)
      throw new Error(`Erro ao salvar usuário temporário: ${tempInsertError.message}`)
    }
    
    console.log('✅ Usuário temporário criado:', tempAuthUser.user.id)
    
    // Fazer login com o usuário temporário para obter token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: tempUserData.email,
      password: tempUserData.password
    })
    
    if (signInError || !signInData.session) {
      throw new Error(`Erro ao fazer login: ${signInError?.message}`)
    }
    
    console.log('🎫 Token obtido, criando usuário SUPERADMIN definitivo...')
    
    // Dados do usuário SUPERADMIN definitivo
    const adminData = {
      name: 'Super Administrator',
      email: 'admin@proxycdn.com',
      password: 'Admin123!',
      role: 'SUPERADMIN',
      company: 'ProxyCDN',
      status: 'ACTIVE'
    }
    
    // Usar o endpoint da API para criar o usuário
    const response = await fetch('http://localhost:3001/api/superadmin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInData.session.access_token}`
      },
      body: JSON.stringify(adminData)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${result.statusMessage || result.message}`)
    }
    
    console.log('🎉 SUPERADMIN criado com sucesso via API!')
    console.log('📧 Email:', adminData.email)
    console.log('🔑 Senha:', adminData.password)
    console.log('👑 Role:', adminData.role)
    
    // Limpar usuário temporário
    console.log('🧹 Removendo usuário temporário...')
    await supabase.auth.admin.deleteUser(tempAuthUser.user.id)
    
    console.log('')
    console.log('🌐 Agora você pode fazer login em: http://localhost:3000/auth/login')
    
  } catch (error) {
    console.error('❌ Erro ao criar SUPERADMIN:', error.message)
    process.exit(1)
  }
}

// Executar script
createSuperAdminViaAPI()