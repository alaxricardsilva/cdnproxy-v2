// API Route Next.js para admin-domains
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
  console.log('[API] GET /api/admin-domains chamado');
  const user = await getUserFromJWT(req);
  if (!user) {
    console.log('[API] GET /api/admin-domains: Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const domains = await prisma.domain.findMany();
    console.log('[API] GET /api/admin-domains: domínios encontrados', domains.length);
    return NextResponse.json(domains);
  } catch (err) {
    console.error('[API] GET /api/admin-domains: erro', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Criar novo domínio admin
  const data = await req.json();
  // Garantir campos obrigatórios
  if (!data.name || !data.url || !user.id) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
  }
  // Adicionar campos padrão se não existirem
  const domain = await prisma.domain.create({
    data: {
      name: data.name,
      url: data.url,
      status: data.status || 'active',
      streamBaseUrl: data.streamBaseUrl || 'https://streaming.example.com',
      userId: user.id,
    },
  });
  return NextResponse.json(domain);
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Atualizar domínio admin
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const updated = await prisma.domain.update({ where: { id: data.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Remover domínio admin
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  await prisma.domain.delete({ where: { id: data.id } });
  return NextResponse.json({ success: true });
}