import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserAndGenerateToken(email: string, password: string): Promise<string | null> {
    // Adiciona busca por e-mail no UsersService
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  // Verifica se o usuário tem 2FA ativado
  async checkUser2fa(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    // Supondo que o campo 'twoFactorEnabled' exista no modelo User
    return !!user?.twoFactorEnabled;
  }
}