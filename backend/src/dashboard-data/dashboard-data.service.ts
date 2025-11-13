import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData() {
    return await this.prisma.dashboardData.findFirst();
  }

  async updateDashboardData(updateData: any) {
    return await this.prisma.dashboardData.update({ where: { id: updateData.id }, data: updateData });
  }
}