// Rota de login migrada do backend NestJS para Next.js API Route
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
  console.log('[API] POST /api/auth/login chamado');
  const { email, password } = await req.json();
  if (!email || !password) {
    console.warn('[API] Email ou senha não fornecidos');
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    console.warn('[API] Usuário não encontrado ou senha ausente');
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
  }
  const isPasswordValid = await bcryptjs.compare(password, user.password);
  if (!isPasswordValid) {
    console.warn('[API] Senha inválida para o usuário', email);
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
  }
  // Gerar JWT usando RS256 e chave privada do Supabase
  const jwtPrivateKey = process.env.JWT_PRIVATE_KEY || 'sb_secret_5hvKlvI3WEubygYdpqVmFQ_PuWP8e-A';
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    jwtPrivateKey,
    {
      algorithm: 'RS256',
      expiresIn: '2h'
    }
  );
  console.log('[API] Login bem-sucedido para', email);
  return NextResponse.json({
    status: "OK",
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token
  });
}