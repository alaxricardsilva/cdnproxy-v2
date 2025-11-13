import { Controller, Get } from '@nestjs/common';
import { DashboardDataService } from './dashboard-data.service';

@Controller('api/dashboard-data')
export class DashboardDataController {
  constructor(private readonly dashboardDataService: DashboardDataService) {}
  @Get()
  async getDashboardData() {
    return await this.dashboardDataService.getDashboardData();
  }
}