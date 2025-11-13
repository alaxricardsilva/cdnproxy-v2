import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() userDto: any) {
    return await this.usersService.create(userDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() userDto: any) {
    return await this.usersService.update(id, userDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }

  /**
   * Endpoint para listar todos os usuários sincronizados do Neon Auth.
   */
  @Get('neon-auth-sync')
  async findAllNeonAuthUsersSync() {
    return await this.usersService.findAllNeonAuthUsersSync();
  }

  /**
   * Endpoint para sincronizar usuários do Neon Auth (tabela neon_auth.users_sync) com a tabela local User.
   * Protegido, apenas para testes/admin.
   */
  @Post('sync-neon-auth-sync-table')
  async syncNeonAuthUsersSyncTable() {
    return await this.usersService.syncUsersFromNeonAuthSyncTable();
  }

  /**
   * Endpoint para popular a tabela neon_auth.users_sync com dados fictícios para teste.
   */
  @Post('seed-neon-auth-sync')
  async seedNeonAuthUsersSync() {
    return await this.usersService.seedNeonAuthUsersSync();
  }
}