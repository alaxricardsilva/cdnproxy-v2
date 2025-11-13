import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async findAll() {
    return await this.paymentsService.findAll();
  }

  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return await this.paymentsService.findOne(id);
  }

  @Put(':id')
  async updatePayment(@Param('id') id: string, @Body() paymentDto: any) {
    return await this.paymentsService.update(id, paymentDto);
  }

  @Delete(':id')
  async removePayment(@Param('id') id: string) {
    return await this.paymentsService.remove(id);
  }
}