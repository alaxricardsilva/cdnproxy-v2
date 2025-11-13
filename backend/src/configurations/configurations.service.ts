import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ConfigurationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.configuration.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.configuration.findUnique({ where: { id: Number(id) } });
  }

  async create(configDto: any) {
    return await this.prisma.configuration.create({ data: configDto });
  }

  async update(id: string, configDto: any) {
    return await this.prisma.configuration.update({ where: { id: Number(id) }, data: configDto });
  }

  async remove(id: string) {
    await this.prisma.configuration.delete({ where: { id: Number(id) } });
    return { success: true };
  }
}