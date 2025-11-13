process.env.DATABASE_URL = 'file:memory:?cache=shared';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';

describe('AppModule mínimo (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    jest.setTimeout(20000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication(new ExpressAdapter());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Deve inicializar o NestJS sem erros', async () => {
    expect(app).toBeDefined();
  });
});