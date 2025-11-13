import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { MercadopagoService } from './mercadopago.service';

@Controller('api/mercadopago')
export class MercadoPagoController {
  constructor(private readonly mercadoPagoService: MercadopagoService) {}

  @Get()
  async findAll() {
    return await this.mercadoPagoService.findAll();
  }

  @Get(':id')
  async getMercadopagoTransaction(@Param('id') id: string) {
    return await this.mercadoPagoService.findOne(id);
  }

  @Put(':id')
  async updateMercadopagoTransaction(@Param('id') id: string, @Body() mpDto: any) {
    return await this.mercadoPagoService.update(id, mpDto);
  }

  @Delete(':id')
  async removeMercadopagoTransaction(@Param('id') id: string) {
    return await this.mercadoPagoService.remove(id);
  }
}