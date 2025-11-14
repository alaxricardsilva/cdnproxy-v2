import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { PrismaClient } from '@prisma/client';
import { Algorithm } from 'jsonwebtoken';

const prisma = new PrismaClient();

const jwksUri = process.env.JWT_JWKS_URL;
if (!jwksUri) {
  throw new Error('JWT_JWKS_URL não está definido nas variáveis de ambiente.');
}
const jwtAlgorithm = (process.env.JWT_ALGORITHM || 'RS256') as Algorithm;
const client = jwksClient({ jwksUri });

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
              if (err || !key) return callback(err || new Error('Chave de assinatura não encontrada.'));
              const signingKey = key.getPublicKey();
              callback(null, signingKey);
            });
          },
          { algorithms: [jwtAlgorithm] },
          (err, decoded) => {
            if (err) return reject(err);
            resolve(decoded);
          }
        );
      });
    } catch (err) {
      return NextResponse.json({ loggedIn: false, error: 'Token inválido ou expirado.' }, { status: 401 });
    }
    // Buscar usuário no banco para garantir que existe
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return NextResponse.json({ loggedIn: false, error: 'Usuário não encontrado.' }, { status: 401 });
    }
    return NextResponse.json({ loggedIn: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    return NextResponse.json({ loggedIn: false, error: 'Erro interno.' }, { status: 500 });
  }
}