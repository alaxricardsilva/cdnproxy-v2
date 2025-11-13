// Removido decorators do TypeORM e adaptado para uso do Prisma
export class Plan {
  id!: number;
  name?: string;
  price?: number;
  duration?: number;
  created_at?: Date;
  updated_at?: Date;
}