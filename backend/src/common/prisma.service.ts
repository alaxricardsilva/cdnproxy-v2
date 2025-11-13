import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    // Log detalhado da configuração do banco
    console.log('[PrismaService] DATABASE_URL:', process.env.DATABASE_URL);
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon')) {
      console.log('[PrismaService] Detectado NeonDB, recomenda-se usar connection_limit=1 para serverless.');
    } else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('file:memory')) {
      console.log('[PrismaService] Usando SQLite em memória para testes.');
    }
  }

  async onModuleInit() {
    try {
      console.log('[PrismaService] Tentando conectar ao banco...');
      await this.$connect();
      console.log('[PrismaService] Conexão Prisma estabelecida com sucesso.');
    } catch (err) {
      console.error('[PrismaService] Erro ao conectar ao banco:', err);
      // Tratamento robusto: tenta reconectar após um tempo
      for (let i = 1; i <= 3; i++) {
        console.log(`[PrismaService] Tentando reconectar (${i}/3)...`);
        await new Promise(res => setTimeout(res, 2000 * i));
        try {
          await this.$connect();
          console.log('[PrismaService] Reconexão bem-sucedida!');
          return;
        } catch (reErr) {
          console.error(`[PrismaService] Falha na tentativa ${i}:`, reErr);
        }
      }
      throw err;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      console.log('[PrismaService] Desconectado do banco com sucesso.');
    } catch (err) {
      console.error('[PrismaService] Erro ao desconectar do banco:', err);
    }
  }
}
// Adicionado tratamento de reconexão e logs detalhados para robustez.