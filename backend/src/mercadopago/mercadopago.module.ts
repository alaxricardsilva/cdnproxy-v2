import { Module } from '@nestjs/common';
import { MercadopagoService } from './mercadopago.service';
import { MercadoPagoController } from './mercadopago.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  imports: [],
  providers: [MercadopagoService, PrismaService], // Adiciona PrismaService como provider
  controllers: [MercadoPagoController],
  exports: [MercadopagoService],
})
export class MercadopagoModule {}