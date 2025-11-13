import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const configs = await prisma.configuration.findMany();
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const config = await prisma.configuration.create({ data });
  return NextResponse.json(config);
}