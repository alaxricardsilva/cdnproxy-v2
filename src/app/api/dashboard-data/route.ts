import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const dashboardData = await prisma.dashboardData.findFirst();
  return NextResponse.json(dashboardData);
}

export async function PUT(req: NextRequest) {
  const updateData = await req.json();
  const updated = await prisma.dashboardData.update({ where: { id: updateData.id }, data: updateData });
  return NextResponse.json(updated);
}