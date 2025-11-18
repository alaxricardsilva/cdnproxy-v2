import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/generated/prisma';
import { getUserFromJWT } from '@/src/utils/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getDateTimeSP() {
  const now = new Date();
  // Ajusta para o fuso horário America/Sao_Paulo
  const offset = -3; // UTC-3
  const localDate = new Date(now.getTime() + offset * 60 * 60 * 1000);
  return format(localDate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

export async function GET(req: NextRequest) {
  const dateTime = getDateTimeSP();
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('host') || 'IP não identificado';
  const user = await getUserFromJWT(req);
  const userId = user?.id || 'Usuário não autenticado';
  console.log(`[${dateTime}][API] GET /api/dashboard-data chamado | IP: ${ip} | UserID: ${userId}`);
  if (!user) {
    console.log(`[${dateTime}][API] GET /api/dashboard-data: Unauthorized | IP: ${ip}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const dashboardData = await prisma.dashboardData.findFirst();
    if (!dashboardData) {
      console.log(`[${dateTime}][API] GET /api/dashboard-data: Nenhum dado disponível | UserID: ${userId} | IP: ${ip}`);
      return NextResponse.json({ data: [], message: 'Nenhum dado disponível' });
    }
    console.log(`[${dateTime}][API] GET /api/dashboard-data: Dados encontrados | UserID: ${userId} | IP: ${ip} | Dados: ${JSON.stringify(dashboardData)}`);
    return NextResponse.json(dashboardData);
  } catch (err: any) {
    console.error(`[${dateTime}][API] GET /api/dashboard-data: Erro | UserID: ${userId} | IP: ${ip} | Erro: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const updateData = await req.json();
  const updated = await prisma.dashboardData.update({ where: { id: updateData.id }, data: updateData });
  return NextResponse.json(updated);
}