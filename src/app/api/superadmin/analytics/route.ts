import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const prisma = new PrismaClient();

const JWKS_URI = process.env.SUPABASE_JWKS_URL || 'https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/keys';
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
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
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
  // Buscar dados de analytics do superadmin
  const analytics = await prisma.analytics.findMany();
  return NextResponse.json(analytics);
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