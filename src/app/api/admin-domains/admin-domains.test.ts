// @ts-nocheck
import { PrismaClient } from '@prisma/client';
describe('API Admin Domains', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve criar novo domínio admin', async () => {
    const domain = await prisma.domain.create({
      data: {
        name: `jest-domain-${Date.now()}`,
        url: `https://jest-domain-${Date.now()}.com`,
        status: 'active',
      },
    });
    expect(domain).toHaveProperty('id');
    expect(domain.status).toBe('active');
  });

  it('deve listar domínios admin', async () => {
    const domains = await prisma.domain.findMany();
    expect(Array.isArray(domains)).toBe(true);
  });

  it('deve atualizar domínio admin', async () => {
    const domain = await prisma.domain.create({
      data: {
        name: `jest-domain-update-${Date.now()}`,
        url: `https://jest-domain-update-${Date.now()}.com`,
        status: 'pending',
      },
    });
    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: { status: 'active' },
    });
    expect(updated.status).toBe('active');
  });

  it('deve remover domínio admin', async () => {
    const domain = await prisma.domain.create({
      data: {
        name: `jest-domain-remove-${Date.now()}`,
        url: `https://jest-domain-remove-${Date.now()}.com`,
        status: 'pending',
      },
    });
    const deleted = await prisma.domain.delete({ where: { id: domain.id } });
    expect(deleted.id).toBe(domain.id);
  });
});