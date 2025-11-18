import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Sincronização Supabase Auth → public.User', () => {
  it('Cria registro em public.User com ROLE ADMIN', async () => {
    const uuid = 'test-uuid-123';
    const email = 'teste@exemplo.com';
    const createdAt = new Date();

    // Simula inserção em auth.users (deve acionar trigger/função)
    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.users (id, email, created_at)
      VALUES ('${uuid}', '${email}', '${createdAt.toISOString()}')
    `);

    // Aguarda trigger/função
    const user = await prisma.user.findUnique({ where: { userId: uuid } });
    expect(user).toBeDefined();
    expect(user?.role).toBe('ADMIN');
    expect(user?.email).toBe(email);
  });

  it('Atribui ROLE SUPERADMIN para e-mail root', async () => {
    const uuid = 'superadmin-uuid-123';
    const email = 'alaxricardsilva@gmail.com';
    const createdAt = new Date();

    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.users (id, email, created_at)
      VALUES ('${uuid}', '${email}', '${createdAt.toISOString()}')
    `);

    const user = await prisma.user.findUnique({ where: { userId: uuid } });
    expect(user?.role).toBe('SUPERADMIN');
  });

  it('Loga erro em caso de falha', async () => {
    const uuid = 'fail-uuid-123';
    // Simula erro proposital (email nulo)
    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.users (id, email, created_at)
      VALUES ('${uuid}', NULL, '${new Date().toISOString()}')
    `);

    // Consulta direta à tabela de erros via queryRaw
    const errorLog = await prisma.$queryRaw`SELECT * FROM sync_errors WHERE user_uuid = ${uuid}`;
    expect(Array.isArray(errorLog)).toBe(true);
    expect(errorLog.length).toBeGreaterThan(0);
  });
});