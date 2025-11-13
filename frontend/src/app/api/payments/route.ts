import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const payments = await prisma.payment.findMany();
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const payment = await prisma.payment.create({ data });
  return NextResponse.json(payment);
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json();
  const payment = await prisma.payment.update({ where: { id: Number(id) }, data });
  return NextResponse.json(payment);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.payment.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}