import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { DeviceDetectionService } from '../common/device-detection.service';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [LogsModule], // Importa LogsModule para resolver LogsService
  providers: [GeolocationService, PrismaService, DeviceDetectionService],
  controllers: [GeolocationController],
  exports: [GeolocationService],
})
export class GeolocationModule {}