import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const plan = await prisma.plan.findUnique({ where: { id: Number(id) } });
  return NextResponse.json(plan);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const data = await request.json();
  const plan = await prisma.plan.update({ where: { id: Number(id) }, data });
  return NextResponse.json(plan);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await prisma.plan.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}