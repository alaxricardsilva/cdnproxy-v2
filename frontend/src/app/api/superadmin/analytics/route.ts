import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const url = req.nextUrl.pathname;
  if (url.endsWith('/tables')) {
    // Informações das tabelas
    const protectedTables = [
      'users','profiles','payments','pixTransactions','domains','plans','configurations','generalConfig','superadminProfile','dashboardData','mercadopagoTransaction'
    ];
    const cleanableTables = [
      'accessLog','geolocationCache','monthlyTraffic','trafficMetrics'
    ];
    const allTables = [...protectedTables, ...cleanableTables];
    const info: Record<string, any> = {};
    for (const table of allTables) {
      try {
        // Só tenta acessar métodos se existirem
        const model = (prisma as any)[table];
        if (model && typeof model.count === 'function' && typeof model.findMany === 'function') {
          const count = await model.count();
          const rows = await model.findMany();
          const sizeBytes = Buffer.byteLength(JSON.stringify(rows));
          info[table] = {
            count,
            sizeKB: (sizeBytes / 1024).toFixed(2),
            sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
            sizeGB: (sizeBytes / (1024 * 1024 * 1024)).toFixed(4),
            canClean: cleanableTables.includes(table),
          };
        } else {
          info[table] = { count: 0, sizeKB: '0', sizeMB: '0', sizeGB: '0', canClean: cleanableTables.includes(table), error: 'Modelo não encontrado ou métodos ausentes' };
        }
      } catch (e) {
        info[table] = { count: 0, sizeKB: '0', sizeMB: '0', sizeGB: '0', canClean: cleanableTables.includes(table), error: 'Erro ao acessar modelo' };
      }
    }
    return NextResponse.json(info);
  }
  // Analytics padrão
  const analytics = await prisma.accessLog.findMany();
  return NextResponse.json(analytics);
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl.pathname;
  if (url.endsWith('/cleanup')) {
    const { table } = await req.json();
    const cleanableTables = [
      'accessLog','geolocationCache','monthlyTraffic','trafficMetrics'
    ];
    if (!cleanableTables.includes(table)) {
      return NextResponse.json({ success: false, message: 'Tabela protegida ou não permitida para limpeza.' });
    }
    try {
      const model = (prisma as any)[table];
      if (model && typeof model.deleteMany === 'function') {
        await model.deleteMany();
        return NextResponse.json({ success: true, message: `Tabela ${table} limpa com sucesso.` });
      } else {
        return NextResponse.json({ success: false, message: `Modelo não encontrado ou método ausente para ${table}.` });
      }
    } catch (e) {
      return NextResponse.json({ success: false, message: `Erro ao limpar tabela ${table}.` });
    }
  }
  return NextResponse.json({ success: false, message: 'Endpoint inválido.' });
}