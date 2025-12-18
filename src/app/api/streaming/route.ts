import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const prisma = new PrismaClient();

// Função para buscar a URL de destino do domínio/cliente
async function getStreamDestination(domain: string, episode: string) {
  const client = await prisma.domain.findUnique({ where: { name: domain } });
  if (!client || !client.streamBaseUrl) return null;
  return `${client.streamBaseUrl}/${episode}`;
}

// Função para registrar o acesso
async function logAccess(data: any) {
  await prisma.accessLog.create({ data });
}

// Função para tentar proxy reverso
async function tryProxy(streamUrl: string, req: NextRequest) {
  try {
    const res = await fetch(streamUrl, {
      headers: {
        'User-Agent': req.headers.get('user-agent') || '',
      },
    });
    if (!res.ok) throw new Error('Proxy failed');
    return new NextResponse(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch (err) {
    return null;
  }
}

function detectDevice(userAgent: string) {
  if (!userAgent) return 'unknown';
  if (/mobile|android|touch|webos|hpwos/i.test(userAgent)) return 'mobile';
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function formatDateToSaoPaulo(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

const JWKS_URI = process.env.SUPABASE_JWKS_URL || 'https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/auth/v1/keys';
const jwks = jwksClient({ jwksUri: JWKS_URI });

async function verifyJWT(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

function getKey(header: any, callback: any) {
  jwks.getSigningKey(header.kid, function (err, key) {
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
  const url = new URL(req.url);
  const episode = url.pathname.split('/').pop();
  const domain = req.headers.get('host') || '';
  const client_ip = req.headers.get('x-forwarded-for') || '';
  const user_agent = req.headers.get('user-agent') || '';
  const deviceType = detectDevice(user_agent);
  const timestamp = formatDateToSaoPaulo(new Date());

  // Buscar URL de destino
  const streamUrl = await getStreamDestination(domain, episode || '');
  if (!streamUrl) {
    return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
  }

  // Registrar acesso
  await logAccess({
    domain_id: domain,
    path: url.pathname,
    client_ip,
    user_agent,
    device_type: deviceType,
    episode_info: episode,
    accessed_at: new Date(),
    timestamp,
  });

  // Tentar proxy reverso
  const proxyResponse = await tryProxy(streamUrl, req);
  if (proxyResponse) {
    return proxyResponse;
  }

  // Se proxy falhar, faz redirecionamento 301
  return NextResponse.redirect(streamUrl, 301);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Criar nova URL de streaming
  const data = await req.json();
  const stream = await prisma.streaming.create({ data });
  return NextResponse.json(stream);
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Atualizar URL de streaming
  const { id, ...data } = await req.json();
  const stream = await prisma.streaming.update({ where: { id: Number(id) }, data });
  return NextResponse.json(stream);
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Remover URL de streaming
  const { id } = await req.json();
  await prisma.streaming.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}