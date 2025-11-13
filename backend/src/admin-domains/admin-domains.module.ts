import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AdminDomainsService } from './admin-domains.service';
import { AdminDomainsController } from './admin-domains.controller';

@Module({
  imports: [],
  providers: [AdminDomainsService, PrismaService], // PrismaService como provider
  controllers: [AdminDomainsController],
  exports: [AdminDomainsService],
})
export class AdminDomainsModule {}