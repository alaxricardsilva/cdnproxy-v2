// Rota de recuperação de senha migrada do backend NestJS para Next.js API Route
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }
  // Implemente lógica de envio de e-mail para recuperação de senha
  // Exemplo: gerar token, enviar e-mail, etc.
  return NextResponse.json({ success: true, message: 'E-mail de recuperação enviado.' });
}