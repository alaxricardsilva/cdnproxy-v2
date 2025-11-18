import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const prisma = new PrismaClient();

const JWKS_URI = process.env.JWT_JWKS_URL ?? '';
const jwtAlgorithm = (process.env.JWT_ALGORITHM || 'RS256');
const client = jwksClient({ jwksUri: JWKS_URI });

async function verifyJWT(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err || !key) {
      callback(err || new Error('Signing key not found'));
    } else {
      const signingKey = key?.getPublicKey?.();
      if (!signingKey) {
        callback(new Error('Public key not found'));
      } else {
        callback(null, signingKey);
      }
    }
  });
}

async function getUserFromJWT(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = await verifyJWT(token);
    return decoded;
  } catch (err) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Parâmetros de filtro
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '24h';
  const status = searchParams.get('status') || 'Todos';
  const search = searchParams.get('search') || '';

  // Filtros de tempo
  const fromDate = new Date();
  if (period === '7d') {
    fromDate.setDate(fromDate.getDate() - 7);
  } else {
    fromDate.setDate(fromDate.getDate() - 1);
  }

  // Montar filtros Prisma
  const where: any = {
    accessed_at: { gte: fromDate },
  };
  if (status !== 'Todos') {
    where.status_code = parseInt(status);
  }
  if (search) {
    where.OR = [
      { client_ip: { contains: search } },
      { path: { contains: search } },
      { user_agent: { contains: search } },
    ];
  }

  // Buscar logs
  const logs = await prisma.accessLog.findMany({
    where,
    orderBy: { accessed_at: 'desc' },
    take: 100,
  });

  // Calcular métricas
  const totalRequests = logs.length;
  const uniqueVisitors = new Set(logs.map(l => l.client_ip)).size;
  const bandwidth = logs.reduce((acc, l) => acc + (l.bytes_transferred || 0), 0);
  const errorRate = logs.filter(l => l.status_code && l.status_code >= 400).length / (totalRequests || 1) * 100;
  const cacheRate = logs.filter(l => l.cache_status === 'HIT').length / (totalRequests || 1) * 100;
  const avgTime = Math.round(logs.reduce((acc, l) => acc + (l.response_time || 0), 0) / (totalRequests || 1));
  const uptime = 100 - errorRate;

  // Dados para gráficos (últimos 30 dias)
  const requestsData = Array(30).fill(0);
  const visitorsData = Array(30).fill(0);
  logs.forEach(l => {
    if (l.accessed_at) {
      const day = Math.max(0, 29 - Math.floor((new Date().getTime() - new Date(l.accessed_at).getTime()) / (1000 * 60 * 60 * 24)));
      requestsData[day]++;
      if (l.client_ip) visitorsData[day]++;
    }
  });

  const metrics = {
    totalRequests,
    uniqueVisitors,
    bandwidth,
    healthStatus: 'Saudável',
    healthLatency: avgTime,
    cacheRate: Math.round(cacheRate),
    avgTime,
    errorRate: Math.round(errorRate),
    uptime: Math.round(uptime),
    requestsData,
    visitorsData,
  };

  return NextResponse.json({ metrics, logs });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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