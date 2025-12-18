import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const plans = await prisma.plan.findMany();
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const plan = await prisma.plan.create({ data });
  return NextResponse.json(plan);
}