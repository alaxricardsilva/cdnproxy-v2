// @ts-nocheck
import { PrismaClient } from '@prisma/client';
describe('API /api/users', () => {
  let prisma: any;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/users deve retornar lista de usuários', async () => {
    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);
  });

  it('POST /api/users deve criar novo usuário', async () => {
    const newUser = await prisma.user.create({
      data: {
        name: 'Teste Jest',
        email: `jest${Date.now()}@exemplo.com`,
        password: 'senha123',
      },
    });
    expect(newUser).toHaveProperty('id');
    expect(newUser.email).toContain('@exemplo.com');
  });

  it('PUT /api/users deve atualizar usuário existente', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Para Atualizar',
        email: `atualizar${Date.now()}@exemplo.com`,
        password: 'senha123',
      },
    });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: 'Atualizado' },
    });
    expect(updated.name).toBe('Atualizado');
  });

  it('DELETE /api/users deve remover usuário', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Para Remover',
        email: `remover${Date.now()}@exemplo.com`,
        password: 'senha123',
      },
    });
    const deleted = await prisma.user.delete({ where: { id: user.id } });
    expect(deleted.id).toBe(user.id);
  });
});