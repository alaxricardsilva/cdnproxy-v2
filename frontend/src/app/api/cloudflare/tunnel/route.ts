import { NextRequest, NextResponse } from 'next/server';

const CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/tunnels`;

if (!CLOUDFLARE_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
  console.warn('[Cloudflare Tunnel] CLOUDFLARE_TOKEN ou CLOUDFLARE_ACCOUNT_ID não definidos nas variáveis de ambiente.');
}

export async function GET(req: NextRequest) {
  if (!CLOUDFLARE_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return NextResponse.json({ error: 'Cloudflare Token ou Account ID não configurados.' }, { status: 500 });
  }
  try {
    const response = await fetch(CLOUDFLARE_API_BASE, {
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.errors || data }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!CLOUDFLARE_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return NextResponse.json({ error: 'Cloudflare Token ou Account ID não configurados.' }, { status: 500 });
  }
  const body = await req.json();
  const { name, config } = body;
  if (!name) {
    return NextResponse.json({ error: 'Nome do túnel é obrigatório.' }, { status: 400 });
  }
  try {
    const response = await fetch(CLOUDFLARE_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, config })
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.errors || data }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!CLOUDFLARE_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return NextResponse.json({ error: 'Cloudflare Token ou Account ID não configurados.' }, { status: 500 });
  }
  const url = new URL(req.url);
  const tunnelId = url.pathname.split('/').pop();
  const body = await req.json();
  const { name, config } = body;
  if (!tunnelId) {
    return NextResponse.json({ error: 'ID do túnel é obrigatório.' }, { status: 400 });
  }
  try {
    const response = await fetch(`${CLOUDFLARE_API_BASE}/${tunnelId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, config })
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.errors || data }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!CLOUDFLARE_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return NextResponse.json({ error: 'Cloudflare Token ou Account ID não configurados.' }, { status: 500 });
  }
  const url = new URL(req.url);
  const tunnelId = url.pathname.split('/').pop();
  if (!tunnelId) {
    return NextResponse.json({ error: 'ID do túnel é obrigatório.' }, { status: 400 });
  }
  try {
    const response = await fetch(`${CLOUDFLARE_API_BASE}/${tunnelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.errors || data }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}