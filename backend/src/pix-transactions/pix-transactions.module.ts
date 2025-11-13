import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PixTransactionsService } from './pix-transactions.service';
import { PixTransactionsController } from './pix-transactions.controller';

@Module({
  imports: [],
  providers: [PixTransactionsService, PrismaService], // PrismaService como provider
  controllers: [PixTransactionsController],
  exports: [PixTransactionsService],
})
export class PixTransactionsModule {}