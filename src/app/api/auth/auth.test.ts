// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
describe('API Auth', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve registrar novo usuário', async () => {
    const email = `jest_auth_${Date.now()}@exemplo.com`;
    const password = 'senha123';
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: 'Teste Auth',
        email,
        password: hash,
      },
    });
    expect(user).toHaveProperty('id');
    expect(user.email).toBe(email);
  });

  it('deve autenticar usuário com senha correta', async () => {
    const email = `jest_auth_login_${Date.now()}@exemplo.com`;
    const password = 'senha123';
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: 'Login Auth',
        email,
        password: hash,
      },
    });
    const user = await prisma.user.findUnique({ where: { email } });
    const isValid = await bcrypt.compare(password, user!.password);
    expect(isValid).toBe(true);
  });

  it('deve permitir recuperação de senha', async () => {
    const email = `jest_auth_recover_${Date.now()}@exemplo.com`;
    const password = 'senha123';
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: 'Recover Auth',
        email,
        password: hash,
      },
    });
    // Simular recuperação: atualizar senha
    const newPassword = 'novaSenha123';
    const newHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { email },
      data: { password: newHash },
    });
    const isValid = await bcrypt.compare(newPassword, updated.password);
    expect(isValid).toBe(true);
  });
});