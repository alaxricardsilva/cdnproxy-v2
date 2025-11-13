import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { LogsModule } from '../logs/logs.module';
import { DeviceDetectionService } from '../common/device-detection.service';

@Module({
  imports: [LogsModule],
  controllers: [StatusController],
  providers: [DeviceDetectionService],
})
export class StatusModule {}