import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export class DashboardData {
  id!: number;
  metric?: string;
  value?: number;
  created_at?: Date;
}