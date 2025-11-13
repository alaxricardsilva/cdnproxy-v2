import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('access_logs')
export class AccessLog {
  id!: number;
  user_id?: string;
  action?: string;
  timestamp?: Date;
  details?: string;
}