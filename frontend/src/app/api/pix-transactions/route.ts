import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const pixTransactions = await prisma.pixTransaction.findMany();
  return NextResponse.json(pixTransactions);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const pixTransaction = await prisma.pixTransaction.create({ data });
  return NextResponse.json(pixTransaction);
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json();
  const pixTransaction = await prisma.pixTransaction.update({ where: { id: Number(id) }, data });
  return NextResponse.json(pixTransaction);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.pixTransaction.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}