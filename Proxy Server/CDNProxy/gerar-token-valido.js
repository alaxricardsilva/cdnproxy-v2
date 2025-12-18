#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Configurações do Supabase
const supabaseUrl = 'https://jyconxalcfqvqakrswnb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Y29ueGFsY2ZxdnFha3Jzd25iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQzMzIzOSwiZXhwIjoyMDc0MDA5MjM5fQ.rMpqmffldlqBgV9EhcjudYY0x27-zlNJzpFJTOYnhtY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function gerarTokenValido() {
  console.log('🔑 Gerando token válido...\n')

  try {
    // Fazer login com as credenciais fornecidas
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'alaxricardsilva@gmail.com',
      password: 'Admin123'
    })

    if (error) {
      console.error('❌ Erro no login:', error.message)
      return
    }

    if (data.session) {
      console.log('✅ Login realizado com sucesso!')
      console.log('🔑 Token de acesso:')
      console.log(data.session.access_token)
      console.log('')
      console.log('👤 Informações do usuário:')
      console.log('   - ID:', data.user.id)
      console.log('   - Email:', data.user.email)
      console.log('   - Nome:', data.user.user_metadata?.name)
      console.log('   - Role:', data.user.user_metadata?.role)
      console.log('   - Expira em:', new Date(data.session.expires_at * 1000).toLocaleString())
      
      return data.session.access_token
    } else {
      console.error('❌ Nenhuma sessão criada')
    }

  } catch (error) {
    console.error('❌ Erro durante o login:', error.message)
  }
}

gerarTokenValido()