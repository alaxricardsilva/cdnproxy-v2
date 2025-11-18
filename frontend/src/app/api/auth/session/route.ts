import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Algorithm } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const jwksUri = process.env.JWT_JWKS_URL;
if (!jwksUri) {
  throw new Error('JWT_JWKS_URL não está definido nas variáveis de ambiente.');
}
const jwtAlgorithm = (process.env.JWT_ALGORITHM || 'RS256') as Algorithm;
const client = jwksClient({ jwksUri });
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ loggedIn: false }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    let decoded;
    try {
      decoded = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          (header, callback) => {
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
          },
          { algorithms: [jwtAlgorithm] },
          (err, decoded) => {
            if (err) {
              return reject(err);
            }
            resolve(decoded);
          }
        );
      });
    } catch (err) {
      return NextResponse.json({ loggedIn: false, error: 'Token inválido ou expirado.' }, { status: 401 });
    }
    // Buscar o role na tabela public.User usando o id do usuário autenticado
    let role: string | null = null;
    try {
      const userId = decoded.sub || decoded.id;
      if (userId) {
        const user = await prisma.user.findUnique({ where: { userId: userId } });
        role = user?.role || null;
      }
    } catch (err) {
      // Se falhar, role permanece null
    }
    return NextResponse.json({ loggedIn: true, user: decoded, role });
  } catch (error) {
    return NextResponse.json({ loggedIn: false, error: 'Erro interno.' }, { status: 500 });
  }
}