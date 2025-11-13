import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('api/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async findAll() {
    return await this.plansService.findAll();
  }

  @Get(':id')
  async getPlan(@Param('id') id: string) {
    return await this.plansService.findOne(id);
  }

  @Put(':id')
  async updatePlan(@Param('id') id: string, @Body() planDto: any) {
    return await this.plansService.update(id, planDto);
  }

  @Delete(':id')
  async removePlan(@Param('id') id: string) {
    return await this.plansService.remove(id);
  }
}