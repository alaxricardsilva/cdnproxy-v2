// Removido decorators do TypeORM e adaptado para uso do Prisma
export class PixTransaction {
  id!: number;
  user_id?: string;
  amount?: number;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Migrado para Prisma: modelo definido em schema.prisma