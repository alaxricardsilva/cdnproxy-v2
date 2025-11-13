import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { GeolocationService } from './geolocation.service';
import { DeviceDetectionService } from '../common/device-detection.service';
import { LogsService } from '../logs/logs.service';

@Controller('geolocation')
export class GeolocationController {
  constructor(
    private readonly geolocationService: GeolocationService,
    private readonly deviceDetectionService: DeviceDetectionService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  async getGeolocation(@Req() req: Request) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = this.deviceDetectionService.detectDevice(userAgent);
    // Registrar log de acesso
    this.logsService.registerAccessLog({ ip: ip || '', deviceInfo, userAgent });
    return this.geolocationService.getGeolocation(ip || '', deviceInfo);
  }
}