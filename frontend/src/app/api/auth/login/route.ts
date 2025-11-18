// Rota de login migrada do backend NestJS para Next.js API Route
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '../../../../../utils/supabase/client';

console.log('[API] Inicializando PrismaClient para login...');
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

prisma.$on('query', (e) => {
  console.log(`[Prisma][QUERY] ${e.query}`);
});
prisma.$on('info', (e) => {
  console.log(`[Prisma][INFO] ${e.message}`);
});
prisma.$on('warn', (e) => {
  console.warn(`[Prisma][WARN] ${e.message}`);
});
prisma.$on('error', (e) => {
  console.error(`[Prisma][ERROR] ${e.message}`);
});

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
  }
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // Retorna o token de acesso e dados do usuário
    return NextResponse.json({
      status: 'OK',
      user: data.user,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}