import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    return NextResponse.json(user);
  }
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const saltRounds = 10;
  body.password = await bcryptjs.hash(body.password, saltRounds);
  const user = await prisma.user.create({ data: body });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const body = await req.json();
  if (body.password) {
    const saltRounds = 10;
    body.password = await bcryptjs.hash(body.password, saltRounds);
  }
  const user = await prisma.user.update({ where: { id: Number(id) }, data: body });
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}