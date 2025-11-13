import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.plan.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.plan.findUnique({ where: { id: Number(id) } });
  }

  async create(planDto: any) {
    return await this.prisma.plan.create({ data: planDto });
  }

  async update(id: string, planDto: any) {
    return await this.prisma.plan.update({ where: { id: Number(id) }, data: planDto });
  }

  async remove(id: string) {
    await this.prisma.plan.delete({ where: { id: Number(id) } });
    return { success: true };
  }
}