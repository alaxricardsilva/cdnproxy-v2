import { PrismaClient } from '@prisma/client';
import process from 'process';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  // 1. Simular login real via endpoint do backend
  const email = process.env.TEST_NEON_AUTH_EMAIL || 'alaxricardsilva@gmail.com'; // E-mail real do usuário Neon Auth
  const password = process.env.TEST_NEON_AUTH_PASSWORD || 'Ric@rd1991'; // Senha real do usuário Neon Auth

  console.log('--- LOGIN VIA NEON AUTH (API) ---');
  let loginResult;
  try {
    const response = await axios.post('http://localhost:3000/api/neon-auth/login', { email, password });
    loginResult = response.data;
    console.log('Login bem-sucedido:', loginResult);
  } catch (err: any) {
    console.error('Erro ao fazer login:', err?.response?.data || err?.message || err);
    process.exit(1);
  }

  // 2. Consultar tabela users_sync para validar sincronização
  console.log('\n--- CONSULTANDO TABELA neon_auth.users_sync ---');
  const users = await prisma.neonAuthUserSync.findMany({ where: { email } }).catch(async (err) => {
    console.error('Erro ao consultar tabela users_sync:', err);
    return [];
  });
  if (users.length > 0) {
    console.log('Usuário encontrado na tabela users_sync:', users[0]);
  } else {
    console.error('Usuário NÃO encontrado na tabela users_sync!');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });