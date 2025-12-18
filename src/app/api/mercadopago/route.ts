import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const mpTransactions = await prisma.mercadopagoTransaction.findMany();
  return NextResponse.json(mpTransactions);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const mpTransaction = await prisma.mercadopagoTransaction.create({ data });
  return NextResponse.json(mpTransaction);
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json();
  const mpTransaction = await prisma.mercadopagoTransaction.update({ where: { id: Number(id) }, data });
  return NextResponse.json(mpTransaction);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.mercadopagoTransaction.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}