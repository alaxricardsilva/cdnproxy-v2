import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payment = await prisma.payment.findUnique({ where: { id: Number(id) } });
  if (!payment) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
  }
  return NextResponse.json(payment);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const data = await request.json();
  const payment = await prisma.payment.update({ where: { id: Number(id) }, data });
  return NextResponse.json(payment);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.payment.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}