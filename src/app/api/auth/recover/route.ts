// Rota de recuperação de senha migrada do backend NestJS para Next.js API Route
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

export async function POST(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 });
  }
  const userFound = await prisma.user.findUnique({ where: { email } });
  if (!userFound) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }
  // Implemente lógica de envio de e-mail para recuperação de senha
  // Exemplo: gerar token, enviar e-mail, etc.
  return NextResponse.json({ success: true, message: 'E-mail de recuperação enviado.' });
}