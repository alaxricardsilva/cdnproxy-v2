import { Controller, Get } from '@nestjs/common';
import { SuperadminGeneralConfigService } from './superadmin-general-config.service';

@Controller('api/superadmin/general-config')
export class SuperadminGeneralConfigController {
  constructor(private readonly configService: SuperadminGeneralConfigService) {}
  @Get()
  async getGeneralConfig() {
    return await this.configService.findFirst();
  }
}