import { Controller, Get, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'express';
import { DeviceDetectionService } from '../common/device-detection.service';
import { LogsService } from '../logs/logs.service';
import { Public } from '../common/jwt-auth.guard';

@Controller('status')
export class StatusController {
  constructor(
    private readonly logsService: LogsService,
    private readonly deviceDetectionService: DeviceDetectionService,
  ) {}
  @Get()
  @Public()
  getStatusPage(@Req() req: Request, @Res() res: Response): void {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = this.deviceDetectionService.detectDevice(userAgent);
    // Registrar log de acesso
    this.logsService.registerAccessLog({ ip, deviceInfo, userAgent });
    // Página HTML estilizada conforme modelo original
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Status do Proxy CDN</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f7f7f7; color: #222; }
          .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #ccc; padding: 32px; }
          h1 { color: #0077cc; }
          .info { margin-top: 24px; font-size: 1.1em; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Status do Proxy CDN</h1>
          <div class="info">
            <p>Este domínio está protegido por CDN Proxy.</p>
            <p>Se você está vendo esta página, o acesso foi realizado via navegador ou bot.</p>
            <p>Para streaming, utilize um aplicativo ou dispositivo compatível.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    res.status(200).send(html);
  }
}