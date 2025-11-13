import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SuperadminProfileService } from './superadmin-profile.service';
import { SuperadminProfileController } from './superadmin-profile.controller';

@Module({
  imports: [],
  providers: [SuperadminProfileService, PrismaService], // PrismaService como provider
  controllers: [SuperadminProfileController],
  exports: [SuperadminProfileService],
})
export class SuperadminProfileModule {}