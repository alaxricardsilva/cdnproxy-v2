import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class GeolocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.geolocationCache.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.geolocationCache.findUnique({ where: { id: Number(id) } });
  }

  async create(geoDto: any) {
    return await this.prisma.geolocationCache.create({ data: geoDto });
  }

  async update(id: string, geoDto: any) {
    return await this.prisma.geolocationCache.update({ where: { id: Number(id) }, data: geoDto });
  }

  async remove(id: string) {
    await this.prisma.geolocationCache.delete({ where: { id: Number(id) } });
    return { success: true };
  }

  async getGeolocation(ip: string, deviceInfo: any) {
    // Busca no cache por IP
    const cached = await this.prisma.geolocationCache.findUnique({ where: { ip } });
    if (cached) {
      return cached;
    }
    // Se não existir, cria novo registro (exemplo simplificado)
    const newGeo = await this.prisma.geolocationCache.create({ data: { ip, deviceInfo } });
    return newGeo;
  }
}