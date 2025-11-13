import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://app.cdnproxy.top',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Sincronização automática de usuários do Neon Auth ao iniciar o app
  const usersService = app.get(require('./users/users.service').UsersService);
  try {
    const syncResult = await usersService.syncUsersFromNeonAuth();
    console.log('Sincronização automática de usuários do Neon Auth:', syncResult);
  } catch (err) {
    console.error('Erro ao sincronizar usuários do Neon Auth:', err);
  }

  await app.listen(process.env.PORT || 5001);
}
bootstrap();