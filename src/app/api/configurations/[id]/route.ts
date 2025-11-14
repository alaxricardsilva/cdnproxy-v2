import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const config = await prisma.configuration.findUnique({ where: { id: Number(id) } });
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const data = await request.json();
  const config = await prisma.configuration.update({ where: { id: Number(id) }, data });
  return NextResponse.json(config);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.configuration.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}