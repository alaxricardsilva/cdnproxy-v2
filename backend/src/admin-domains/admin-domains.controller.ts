import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { AdminDomainsService } from './admin-domains.service';

@Controller('api/admin/domains')
export class AdminDomainsController {
  constructor(private readonly domainsService: AdminDomainsService) {}

  @Get()
  async findAll() {
    return await this.domainsService.findAll();
  }

  @Get(':id')
  async getDomain(@Param('id') id: string) {
    return await this.domainsService.getDomainById(id);
  }

  @Put(':id')
  async updateDomain(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return await this.domainsService.renewDomain(id, body);
  }
}