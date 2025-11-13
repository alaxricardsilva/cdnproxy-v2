import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SuperadminGeneralConfigService } from './superadmin-general-config.service';
import { SuperadminGeneralConfigController } from './superadmin-general-config.controller';

@Module({
  imports: [],
  providers: [SuperadminGeneralConfigService, PrismaService], // PrismaService como provider
  controllers: [SuperadminGeneralConfigController],
  exports: [SuperadminGeneralConfigService],
})
export class SuperadminGeneralConfigModule {}
// Removido: import { TypeOrmModule } from '@nestjs/typeorm';