import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  await prisma.neonAuthUserSync.createMany({
    data: [
      {
        id: '1',
        name: 'Usuário Teste 1',
        email: 'teste1@exemplo.com',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        raw_json: { role: 'ADMIN' },
      },
      {
        id: '2',
        name: 'Usuário Teste 2',
        email: 'teste2@exemplo.com',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        raw_json: { role: 'ADMIN' },
      },
    ],
    skipDuplicates: true,
  });
  return NextResponse.json({ seeded: true });
}