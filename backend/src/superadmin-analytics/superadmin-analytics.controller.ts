import { Controller, Get, Post, Body } from '@nestjs/common';
import { SuperadminAnalyticsService } from './superadmin-analytics.service';

@Controller('api/superadmin/analytics')
export class SuperadminAnalyticsController {
  constructor(private readonly analyticsService: SuperadminAnalyticsService) {}

  @Get('tables')
  async getTablesInfo() {
    return await this.analyticsService.getTablesInfo();
  }

  @Post('cleanup')
  async cleanupTable(@Body() body: { table: string }) {
    return await this.analyticsService.cleanupTable(body.table);
  }

  @Get()
  async getAnalytics() {
    return await this.analyticsService.getAnalytics();
  }
}