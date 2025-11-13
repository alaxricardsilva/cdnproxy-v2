import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AdminDomainsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.domain.findMany();
  }

  async getDomainById(id: string) {
    return await this.prisma.domain.findUnique({ where: { id: Number(id) } });
  }

  async renewDomain(id: string, updateData: any) {
    // Exemplo: atualiza status para 'renewed' ou aplica updateData recebido
    return await this.prisma.domain.update({ where: { id: Number(id) }, data: updateData });
  }

  async create(domainDto: any) {
    return await this.prisma.domain.create({ data: domainDto });
  }

  async update(id: string, domainDto: any) {
    return await this.prisma.domain.update({ where: { id: Number(id) }, data: domainDto });
  }

  async remove(id: string) {
    await this.prisma.domain.delete({ where: { id: Number(id) } });
    return { success: true };
  }
}