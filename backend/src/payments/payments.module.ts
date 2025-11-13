import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [],
  providers: [PaymentsService, PrismaService], // PrismaService como provider
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}