import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PlansService } from './plans.service';
import { Plan } from './plans.entity';
import { PlansController } from './plans.controller';

@Module({
  imports: [],
  providers: [PlansService, PrismaService], // PrismaService como provider
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}