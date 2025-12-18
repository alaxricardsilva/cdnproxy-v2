import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Usar variáveis de ambiente diretamente
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        error: true,
        message: 'Configuração do Supabase não encontrada'
      }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar o primeiro usuário SUPERADMIN
    const { data: superAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'SUPERADMIN')
      .limit(1)
      .single()

    if (!superAdmin) {
      return {
        error: true,
        message: 'Nenhum superadmin encontrado'
      }
    }

    // Buscar configurações de segurança
    const { data: securitySettings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', 'security')

    // Buscar logs recentes
    const { data: recentLogs } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      success: true,
      profile: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        status: superAdmin.status,
        created_at: superAdmin.created_at
      },
      security: {
        settings: securitySettings || [],
        recentLogs: recentLogs || []
      }
    }

  } catch (error: any) {
    return {
      error: true,
      message: error?.message || 'Erro desconhecido',
      stack: error?.stack || 'Stack trace não disponível'
    }
  }
})