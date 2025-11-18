// API Route Next.js para streaming-proxy
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUserFromJWT(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    // Se tiver função de verificação JWT, use aqui. Caso contrário, apenas retorna o token para debug.
    // Exemplo: const decoded = await verifyJWT(token); return decoded;
    return token;
  } catch (err) {
    return null;
  }
}

// Função para buscar a URL de destino do domínio/cliente
async function getStreamDestination(domain: string, episode: string) {
  // Exemplo: buscar no banco de dados a URL de destino cadastrada
  // Substitua por sua lógica real
  const client = await prisma.domain.findUnique({ where: { name: domain } });
  if (!client || !client.streamBaseUrl) return null;
  return `${client.streamBaseUrl}/${episode}`;
}

// Função para registrar o acesso
async function logAccess(data: Record<string, unknown>) {
  await prisma.accessLog.create({ data });
}

// Função para tentar proxy reverso
async function tryProxy(streamUrl: string, req: NextRequest) {
  try {
    const res = await fetch(streamUrl, {
      headers: {
        'User-Agent': req.headers.get('user-agent') || '',
        // Adicione outros headers necessários
      },
    });
    if (!res.ok) throw new Error('Proxy failed');
    // Retorna o stream como resposta
    return new NextResponse(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch (err) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromJWT(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const episode = url.pathname.split('/').pop();
  const domain = req.headers.get('host') || '';
  const client_ip = req.headers.get('x-forwarded-for') || '';
  const user_agent = req.headers.get('user-agent') || '';

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
    device_type: 'auto', // Adapte para detecção real
    episode_info: episode,
    accessed_at: new Date(),
  });

  // Tentar proxy reverso
  const proxyResponse = await tryProxy(streamUrl, req);
  if (proxyResponse) {
    return proxyResponse;
  }

  // Se proxy falhar, faz redirecionamento 301
  return NextResponse.redirect(streamUrl, 301);
}