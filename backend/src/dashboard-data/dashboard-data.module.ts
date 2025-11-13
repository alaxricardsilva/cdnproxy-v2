import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DashboardDataService } from './dashboard-data.service';
import { DashboardDataController } from './dashboard-data.controller';

@Module({
  imports: [],
  providers: [DashboardDataService, PrismaService], // PrismaService como provider
  controllers: [DashboardDataController],
  exports: [DashboardDataService],
})
export class DashboardDataModule {}