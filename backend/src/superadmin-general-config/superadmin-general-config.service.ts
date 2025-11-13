import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SuperadminGeneralConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findFirst() {
    return await this.prisma.generalConfig.findFirst();
  }

  async create(configDto: any) {
    return await this.prisma.generalConfig.create({ data: configDto });
  }

  async update(id: string, configDto: any) {
    return await this.prisma.generalConfig.update({ where: { id: Number(id) }, data: configDto });
  }

  async remove(id: string) {
    await this.prisma.generalConfig.delete({ where: { id: Number(id) } });
    return { success: true };
  }
}