import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  // 1. Buscar todos os usuários do Neon Auth (tabela neon_auth.users_sync)
  const neonUsers = await prisma.neonAuthUserSync.findMany();
  // 2. Buscar todos os usuários locais
  const localUsers = await prisma.user.findMany();
  const localUsersByEmail = Object.fromEntries(localUsers.map((u: any) => [u.email, u]));
  const neonUsersByEmail = Object.fromEntries(neonUsers.map((u: any) => [u.email, u]));

  let created = 0, updated = 0, removed = 0;

  // 3. Criar/atualizar usuários locais
  for (const neonUser of neonUsers) {
    if (!neonUser.email) continue;
    const local = localUsersByEmail[neonUser.email];
    if (!local) {
      await prisma.user.create({
        data: {
          email: neonUser.email,
          name: neonUser.name || neonUser.email,
          password: '',
          role: 'ADMIN',
        },
      });
      created++;
    } else {
      await prisma.user.update({
        where: { id: local.id },
        data: {
          name: neonUser.name || neonUser.email,
          role: local.role || 'ADMIN',
        },
      });
      updated++;
    }
  }

  // 4. Remover usuários locais que não existem mais no Neon Auth
  for (const local of localUsers) {
    if (!neonUsersByEmail[local.email]) {
      await prisma.user.delete({ where: { id: local.id } });
      removed++;
    }
  }

  return NextResponse.json({ created, updated, removed });
}