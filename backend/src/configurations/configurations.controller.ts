import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';

@Controller('api/configurations')
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Get()
  async findAll() {
    return await this.configurationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.configurationsService.findOne(id);
  }

  @Post()
  async create(@Body() configDto: any) {
    return await this.configurationsService.create(configDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() configDto: any) {
    return await this.configurationsService.update(id, configDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.configurationsService.remove(id);
  }
}