// API Route Next.js para admin-domains
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: lógica de listagem de domínios admin
  return NextResponse.json({ message: 'GET admin-domains' });
}

export async function POST(req: NextRequest) {
  // TODO: lógica de criação de domínio admin
  return NextResponse.json({ message: 'POST admin-domains' });
}

export async function PUT(req: NextRequest) {
  // TODO: lógica de atualização de domínio admin
  return NextResponse.json({ message: 'PUT admin-domains' });
}

export async function DELETE(req: NextRequest) {
  // TODO: lógica de remoção de domínio admin
  return NextResponse.json({ message: 'DELETE admin-domains' });
}