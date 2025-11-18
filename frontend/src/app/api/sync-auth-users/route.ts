import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function syncAuthUsersToPublicUser() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error('Erro ao buscar usuários do Supabase Auth: ' + error.message);

  let count = 0;
  for (const authUser of data.users) {
    const email = authUser.email;
    if (!email) continue;
    const uuid = authUser.id;
    const name = authUser.user_metadata?.name || email;
    let role = 'ADMIN';
    if (email === 'alaxricardsilva@gmail.com') role = 'SUPERADMIN';
    else if (email === 'alaxricardsilva@outlook.com') role = 'ADMIN';

    await prisma.user.upsert({
      where: { userId: uuid },
      update: { email, name, role },
      create: {
        userId: uuid,
        email,
        name,
        password: '',
        role,
      },
    });
    count++;
  }
  await prisma.$disconnect();
  return count;
}

export async function POST(req: NextRequest) {
  try {
    const count = await syncAuthUsersToPublicUser();
    return NextResponse.json({ success: true, message: `Sincronização concluída. ${count} usuários processados.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return await POST(req);
}