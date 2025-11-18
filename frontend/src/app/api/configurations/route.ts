import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { createClient } from '../../../../utils/supabase/client';

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
  // Buscar dados de configurações gerais
  const configs = await prisma.configuration.findMany();
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const config = await prisma.configuration.create({ data });
  return NextResponse.json(config);
}
// Função para obter configurações gerais (GET)