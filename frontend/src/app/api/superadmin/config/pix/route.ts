import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const prisma = new PrismaClient();

const JWKS_URI = process.env.JWT_JWKS_URL ?? '';
const jwtAlgorithm = (process.env.JWT_ALGORITHM || 'RS256');
const client = jwksClient({ jwksUri: JWKS_URI });

async function getUserFromJWT(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') return null;
    const kid = decoded.header.kid;
    const key = await client.getSigningKey(kid);
    const publicKey = key?.getPublicKey?.();
    if (!publicKey) return null;
    const payload = jwt.verify(token, publicKey);
    return payload;
  } catch {
    return null;
  }
}

// GET: retorna configuração atual do PIX
export async function GET(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const config = await prisma.configuration.findUnique({ where: { key: 'pix_config' } });
  return NextResponse.json(config && config.value ? JSON.parse(config.value) : {});
}

// POST: cria ou atualiza configuração do PIX
export async function POST(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await req.json(); // { enabled, ...outrosCampos }
  const value = JSON.stringify(data);
  const existing = await prisma.configuration.findUnique({ where: { key: 'pix_config' } });
  let config;
  if (existing) {
    config = await prisma.configuration.update({ where: { key: 'pix_config' }, data: { value } });
  } else {
    config = await prisma.configuration.create({ data: { key: 'pix_config', value } });
  }
  return NextResponse.json(config && config.value ? JSON.parse(config.value) : {});
}