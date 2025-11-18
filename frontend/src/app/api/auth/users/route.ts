// Rota para listar todos os usuários via Supabase Admin API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../utils/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    // Busca todos os usuários (até 1000 por padrão)
    const { data, error } = await supabase.auth.admin.listUsers({
      // Você pode adicionar paginação/filtros aqui se necessário
      // Exemplo: page, perPage
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ users: data.users });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name }
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ user: data.user });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}