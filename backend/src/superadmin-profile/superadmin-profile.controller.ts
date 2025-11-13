import { Controller, Get, Put, Post, Body, Req } from '@nestjs/common';
import { SuperadminProfileService } from './superadmin-profile.service';

@Controller('api/superadmin/profile')
export class SuperadminProfileController {
  constructor(private readonly profileService: SuperadminProfileService) {}

  @Get()
  async getProfile(@Req() req: any) {
    const userId = typeof req.user?.id === 'number' ? req.user.id : 1;
    return await this.profileService.getProfile(userId);
  }

  @Put()
  async updateProfile(@Req() req: any, @Body() body: Record<string, unknown>) {
    const userId = typeof req.user?.id === 'number' ? req.user.id : 1;
    return await this.profileService.updateProfile(userId, body);
  }

  @Post()
  async createProfile(@Body() body: { name: string; email: string }) {
    // Cria perfil do superadmin usando dados fornecidos
    return await this.profileService.createProfile({ name: body.name, email: body.email });
  }
}