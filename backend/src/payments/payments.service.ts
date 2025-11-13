import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.payment.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.payment.findUnique({ where: { id: Number(id) } });
  }

  async create(paymentDto: any) {
    return await this.prisma.payment.create({ data: paymentDto });
  }

  async update(id: string, paymentDto: any) {
    return await this.prisma.payment.update({ where: { id: Number(id) }, data: paymentDto });
  }

  async remove(id: string) {
    await this.prisma.payment.delete({ where: { id: Number(id) } });
    return { success: true };
  }
}