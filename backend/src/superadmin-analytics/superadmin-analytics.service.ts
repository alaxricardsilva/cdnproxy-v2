import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SuperadminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics() {
    // Buscar dados reais do banco de dados (exemplo: logs de acesso)
    // Ajuste conforme o modelo definido no schema.prisma
    return await this.prisma.accessLog.findMany();
  }

  async getTablesInfo() {
    // Tabelas protegidas (apenas consulta)
    const protectedTables = [
      'users',
      'profiles',
      'payments',
      'pixTransactions',
      'domains',
      'plans',
      'configurations',
      'generalConfig',
      'superadminProfile',
      'dashboardData',
      'mercadopagoTransaction',
    ];
    // Tabelas permitidas para limpeza
    const cleanableTables = [
      'accessLog',
      'geolocationCache',
      'monthlyTraffic',
      'trafficMetrics',
    ];
    const allTables = [...protectedTables, ...cleanableTables];
    const info: Record<string, any> = {};
    const modelMap: Record<string, any> = {
      users: this.prisma.user,
      profiles: this.prisma.profile,
      payments: this.prisma.payment,
      pixTransactions: this.prisma.pixTransaction,
      domains: this.prisma.domain,
      plans: this.prisma.plan,
      configurations: this.prisma.configuration,
      generalConfig: this.prisma.generalConfig,
      superadminProfile: this.prisma.superadminProfile,
      dashboardData: this.prisma.dashboardData,
      mercadopagoTransaction: this.prisma.mercadopagoTransaction,
      accessLog: this.prisma.accessLog,
      geolocationCache: this.prisma.geolocationCache,
      monthlyTraffic: this.prisma.monthlyTraffic,
      trafficMetrics: this.prisma.trafficMetrics,
    };
    for (const table of allTables) {
      try {
        const count = await modelMap[table].count();
        // Calcular tamanho estimado dos dados (em bytes)
        const rows = await modelMap[table].findMany();
        const sizeBytes = Buffer.byteLength(JSON.stringify(rows));
        info[table] = {
          count,
          sizeKB: (sizeBytes / 1024).toFixed(2),
          sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
          sizeGB: (sizeBytes / (1024 * 1024 * 1024)).toFixed(4),
          canClean: cleanableTables.includes(table),
        };
      } catch (e) {
        info[table] = { count: 0, sizeKB: '0', sizeMB: '0', sizeGB: '0', canClean: cleanableTables.includes(table), error: 'Modelo não encontrado' };
      }
    }
    return info;
  }

  async cleanupTable(table: string) {
    // Limpar dados de uma tabela permitida
    const cleanableTables = [
      'accessLog',
      'geolocationCache',
      'monthlyTraffic',
      'trafficMetrics',
    ];
    const modelMap: Record<string, any> = {
      accessLog: this.prisma.accessLog,
      geolocationCache: this.prisma.geolocationCache,
      monthlyTraffic: this.prisma.monthlyTraffic,
      trafficMetrics: this.prisma.trafficMetrics,
    };
    if (!cleanableTables.includes(table)) {
      return { success: false, message: 'Tabela protegida ou não permitida para limpeza.' };
    }
    try {
      await modelMap[table].deleteMany();
      return { success: true, message: `Tabela ${table} limpa com sucesso.` };
    } catch (e) {
      return { success: false, message: `Erro ao limpar tabela ${table}.` };
    }
  }
}