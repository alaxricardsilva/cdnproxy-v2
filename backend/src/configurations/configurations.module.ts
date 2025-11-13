import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ConfigurationsService } from './configurations.service';
import { ConfigurationsController } from './configurations.controller';

@Module({
  imports: [],
  providers: [ConfigurationsService, PrismaService], // PrismaService como provider
  controllers: [ConfigurationsController],
  exports: [ConfigurationsService],
})
export class ConfigurationsModule {}