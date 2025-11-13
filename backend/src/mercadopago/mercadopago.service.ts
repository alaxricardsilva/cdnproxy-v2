import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class MercadopagoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.mercadopagoTransaction.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.mercadopagoTransaction.findUnique({ where: { id: Number(id) } });
  }

  async create(mpDto: any) {
    return await this.prisma.mercadopagoTransaction.create({ data: mpDto });
  }

  async update(id: string, mpDto: any) {
    return await this.prisma.mercadopagoTransaction.update({ where: { id: Number(id) }, data: mpDto });
  }

  async remove(id: string) {
    await this.prisma.mercadopagoTransaction.delete({ where: { id: Number(id) } });
    return { success: true };
  }
}