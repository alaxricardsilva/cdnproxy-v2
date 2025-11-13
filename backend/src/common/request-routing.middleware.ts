import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DeviceDetectionService } from './device-detection.service';

@Injectable()
export class RequestRoutingMiddleware implements NestMiddleware {
  constructor(private readonly deviceDetectionService: DeviceDetectionService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = this.deviceDetectionService.detectDevice(userAgent);

    // Lógica de decisão baseada no tipo de dispositivo/app
    if (deviceInfo.isBot) {
      // Redireciona bots para página de status
      return res.redirect('/status');
    }
    if (deviceInfo.isBrowser) {
      // Exibe página de status para navegadores
      return res.redirect('/status');
    }
    if (deviceInfo.isStreamingDevice || deviceInfo.isApp) {
      // Permite acesso ao streaming
      return next();
    }
    // Fallback: exibe página de status
    return res.redirect('/status');
  }
}