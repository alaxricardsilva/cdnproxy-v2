import { Controller, Get, Req, Param, Query, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { StreamingProxyService } from './streaming-proxy.service';
import { DeviceDetectionService } from '../common/device-detection.service';
import { LogsService } from '../logs/logs.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('streaming')
export class StreamingProxyController {
  constructor(
    private readonly streamingProxyService: StreamingProxyService,
    private readonly deviceDetectionService: DeviceDetectionService,
    private readonly logsService: LogsService,
  ) {}

  @Get('iptv/:episode')
  @UseGuards(JwtAuthGuard)
  async getIptvStream(
    @Req() req: Request,
    @Param('episode') episode: string,
    @Query() query: any,
  ) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = this.deviceDetectionService.detectDevice(userAgent);
    // Registrar log de acesso
    this.logsService.registerAccessLog({ ip, deviceInfo, episode, userAgent });
    return this.streamingProxyService.getIptvStream(episode, query, ip, userAgent, deviceInfo);
  }
}