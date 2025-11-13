import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma, SuperadminProfile } from '@prisma/client';

@Injectable()
export class SuperadminProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return await this.prisma.superadminProfile.findUnique({ where: { id: Number(userId) } });
  }

  async updateProfile(userId: string, updates: Record<string, unknown>) {
    await this.prisma.superadminProfile.update({ where: { id: Number(userId) }, data: updates });
    return await this.prisma.superadminProfile.findUnique({ where: { id: Number(userId) } });
  }

  async createProfile(data: Prisma.SuperadminProfileCreateInput) {
    return await this.prisma.superadminProfile.create({ data });
  }
}