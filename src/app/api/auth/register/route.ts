// Rota de registro migrada do backend NestJS para Next.js API Route
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
  }
  const hashedPassword = await bcryptjs.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: 'USER' },
  });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}
// Adicione o pacote @types/bcrypt para tipagem se necessário.