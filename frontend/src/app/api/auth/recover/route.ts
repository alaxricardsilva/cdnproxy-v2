// Rota de recuperação de senha migrada do backend NestJS para Next.js API Route
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../utils/supabase/client';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
  }
  // Recuperação de senha pelo Supabase Auth
  // Utilize o método resetPasswordForEmail do Supabase Auth Admin API
  try {
    const supabase = createClient();
    // O método correto é supabase.auth.resetPasswordForEmail (client-side), não existe na admin API
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}