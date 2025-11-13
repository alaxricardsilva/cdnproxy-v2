import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hashes diferentes para cada usuário
  const saltRounds = 10;
  const superadminPassword = await bcrypt.hash('Admin123', saltRounds);
  const adminPassword = await bcrypt.hash('Admin123', saltRounds);

  await prisma.user.upsert({
    where: { email: 'alaxricardsilva@gmail.com' },
    update: {
      name: 'SUPERADMIN',
      password: superadminPassword,
      role: 'SUPERADMIN',
      twoFactorEnabled: true,
    },
    create: {
      email: 'alaxricardsilva@gmail.com',
      name: 'SUPERADMIN',
      password: superadminPassword,
      role: 'SUPERADMIN',
      twoFactorEnabled: true,
      twoFactorSecret: 'PLACEHOLDER_SECRET',
    },
  });

  await prisma.user.upsert({
    where: { email: 'alaxricardsilva@outlook.com' },
    update: {
      name: 'ADMIN',
      password: adminPassword,
      role: 'ADMIN',
      twoFactorEnabled: false,
    },
    create: {
      email: 'alaxricardsilva@outlook.com',
      name: 'ADMIN',
      password: adminPassword,
      role: 'ADMIN',
      twoFactorEnabled: false,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });