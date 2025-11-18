import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hashes para as senhas fornecidas
  const superadminPassword = await bcrypt.hash('Admin123', 10);
  const adminPassword = await bcrypt.hash('Admin123', 10);

  // Removido: await prisma.user.upsert({ ... }) e qualquer referência a prisma.user
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });