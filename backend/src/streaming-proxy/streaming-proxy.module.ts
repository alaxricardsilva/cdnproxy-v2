import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StreamingProxyService } from './streaming-proxy.service';
import { StreamingProxyController } from './streaming-proxy.controller';
import { DeviceDetectionService } from '../common/device-detection.service';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule], // Importa LogsModule para resolver LogsService
  providers: [StreamingProxyService, PrismaService, DeviceDetectionService], // DeviceDetectionService como provider
  controllers: [StreamingProxyController],
  exports: [StreamingProxyService],
})
export class StreamingProxyModule {}