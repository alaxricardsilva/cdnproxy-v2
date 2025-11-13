import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PixTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.pixTransaction.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.pixTransaction.findUnique({ where: { id: Number(id) } });
  }

  async create(pixDto: any) {
    return await this.prisma.pixTransaction.create({ data: pixDto });
  }

  async update(id: string, pixDto: any) {
    return await this.prisma.pixTransaction.update({ where: { id: Number(id) }, data: pixDto });
  }

  async remove(id: string) {
    await this.prisma.pixTransaction.delete({ where: { id: Number(id) } });
    return { success: true };
  }
}