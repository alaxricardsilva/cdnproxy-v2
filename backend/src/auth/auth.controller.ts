import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import axios from 'axios';
import * as speakeasy from 'speakeasy';
import { UsersService } from '../users/users.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const token = await this.authService.validateUserAndGenerateToken(loginDto.email, loginDto.password);
    if (!token) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }
}

@Controller('api/neon-auth')
export class NeonAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  // Endpoint para gerar e salvar segredo TOTP para o usuário
  @Post('generate-2fa-secret')
  async generate2faSecret(@Body() body: { email: string }) {
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      return { success: false, message: 'Usuário não encontrado' };
    }
    // Gera segredo TOTP
    const secret = speakeasy.generateSecret({ length: 20, name: `CDNProxy (${user.email})` });
    // Salva segredo no banco
    await this.usersService.update(user.id.toString(), { twoFactorSecret: secret.base32, twoFactorEnabled: true });
    // Retorna o segredo e o otpauth_url para gerar QR Code no frontend
    return {
      success: true,
      secret: secret.base32,
      otpauth_url: secret.otpauth_url,
    };
  }

  // Endpoint para verificar código TOTP
  @Post('verify-2fa')
  async verify2fa(@Body() body: { email: string; code2fa: string }) {
    const user = await this.usersService.findByEmail(body.email);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return { success: false, message: '2FA não habilitado ou usuário inválido' };
    }
    // Verifica código TOTP
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: body.code2fa,
      window: 1,
    });
    return { success: verified };
  }

  @Post('login')
  async neonLogin(@Body() body: { email: string; password: string }) {
    // Chamada REST para autenticação Stack Auth (Neon Auth)
    try {
        const response = await axios.post(
            `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}/auth/signin`,
            {
                email: body.email,
                password: body.password,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.STACK_SECRET_SERVER_KEY}`,
                },
            }
        );
        const jwt = response.data?.access_token;
        if (!jwt) throw new UnauthorizedException('Credenciais inválidas');
        // Verifica se o usuário tem 2FA ativado
        const require2fa = await this.authService.checkUser2fa(body.email);
        return { access_token: jwt, require2fa };
    } catch (err) {
        throw new UnauthorizedException('Credenciais inválidas ou erro na autenticação Neon Auth');
    }
  }
}