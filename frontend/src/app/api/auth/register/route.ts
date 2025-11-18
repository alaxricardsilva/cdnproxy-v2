// Rota de registro migrada do backend NestJS para Next.js API Route
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../utils/supabase/client';
import bcryptjs from 'bcryptjs';

// Removido PrismaClient, pois o registro é feito via Supabase Auth

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'USER' }
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Chama a rota de sincronização após registro
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sync-auth-users`, {
        method: 'POST',
      });
    } catch (syncError) {
      // Apenas loga o erro de sincronização, não impede registro
      console.error('Erro ao sincronizar usuário:', syncError);
    }
    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// Adicione o pacote @types/bcrypt para tipagem se necessário.