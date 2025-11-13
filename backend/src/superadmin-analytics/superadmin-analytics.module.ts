import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SuperadminAnalyticsService } from './superadmin-analytics.service';
import { SuperadminAnalyticsController } from './superadmin-analytics.controller';

@Module({
  imports: [],
  providers: [SuperadminAnalyticsService, PrismaService], // PrismaService como provider
  controllers: [SuperadminAnalyticsController],
  exports: [SuperadminAnalyticsService],
})
export class SuperadminAnalyticsModule {}
// Removido: import { TypeOrmModule } from '@nestjs/typeorm';