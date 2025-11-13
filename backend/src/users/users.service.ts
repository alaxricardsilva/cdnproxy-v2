import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.user.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.user.findUnique({ where: { id: Number(id) } });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async create(userDto: any) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userDto.password, saltRounds);
    return await this.prisma.user.create({
      data: {
        ...userDto,
        password: hashedPassword,
      },
    });
  }

  async update(id: string, userDto: any) {
    if (userDto.password) {
      const saltRounds = 10;
      userDto.password = await bcrypt.hash(userDto.password, saltRounds);
    }
    return await this.prisma.user.update({ where: { id: Number(id) }, data: userDto });
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id: Number(id) } });
    return { success: true };
  }

  /**
   * Busca todos os usuários sincronizados do Neon Auth (tabela neon_auth.users_sync).
   */
  async findAllNeonAuthUsersSync() {
    return await this.prisma.neonAuthUserSync.findMany();
  }

  /**
   * Popula a tabela neon_auth.users_sync com dados fictícios para teste.
   */
  async seedNeonAuthUsersSync() {
    await this.prisma.neonAuthUserSync.createMany({
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
    return { seeded: true };
  }

  /**
   * Sincroniza usuários do Neon Auth (tabela neon_auth.users_sync) com a tabela local User.
   * Cria usuários locais com ROLE ADMIN se não existirem, atualiza dados se já existirem,
   * remove locais se não existirem mais no Neon Auth.
   */
  async syncUsersFromNeonAuthSyncTable(): Promise<{ created: number; updated: number; removed: number }> {
    // 1. Buscar todos os usuários do Neon Auth (tabela neon_auth.users_sync)
    const neonUsers = await this.prisma.neonAuthUserSync.findMany();

    // 2. Buscar todos os usuários locais
    const localUsers = await this.prisma.user.findMany();
    const localUsersByEmail = Object.fromEntries(localUsers.map(u => [u.email, u]));
    const neonUsersByEmail = Object.fromEntries(neonUsers.map((u: any) => [u.email, u]));

    let created = 0, updated = 0, removed = 0;

    // 3. Criar/atualizar usuários locais
    for (const neonUser of neonUsers) {
      if (!neonUser.email) continue; // Ignora registros sem e-mail
      const local = localUsersByEmail[neonUser.email];
      if (!local) {
        // Cria usuário local com ROLE ADMIN
        await this.prisma.user.create({
          data: {
            email: neonUser.email!, // Garante que é string
            name: neonUser.name || neonUser.email,
            password: '', // senha pode ser vazia, pois login é externo
            role: 'ADMIN',
          },
        });
        created++;
      } else {
        // Atualiza dados básicos
        await this.prisma.user.update({
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
        await this.prisma.user.delete({ where: { id: local.id } });
        removed++;
      }
    }

    return { created, updated, removed };
  }
}