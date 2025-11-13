import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { PixTransactionsService } from './pix-transactions.service';

@Controller('api/pix-transactions')
export class PixTransactionsController {
  constructor(private readonly pixTransactionsService: PixTransactionsService) {}

  @Get()
  async findAll() {
    return await this.pixTransactionsService.findAll();
  }

  @Get(':id')
  async getPixTransaction(@Param('id') id: string) {
    return await this.pixTransactionsService.findOne(id);
  }

  @Put(':id')
  async updatePixTransaction(@Param('id') id: string, @Body() pixDto: any) {
    return await this.pixTransactionsService.update(id, pixDto);
  }

  @Delete(':id')
  async removePixTransaction(@Param('id') id: string) {
    return await this.pixTransactionsService.remove(id);
  }
}