// Rota para atualizar, desativar e excluir usuário via Supabase Admin API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/client';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { email, password, name, phone, disabled } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
  }
  // Validação simples para telefone: apenas DDD (2 dígitos) + número (8 ou 9 dígitos)
  let formattedPhone: string | undefined = undefined;
  if (phone) {
    const match = phone.match(/^\d{2}(\d{8,9})$/);
    if (!match) {
      return NextResponse.json({ error: 'Telefone deve conter apenas DDD (2 dígitos) seguido do número (8 ou 9 dígitos), sem espaços ou caracteres especiais.' }, { status: 400 });
    }
    formattedPhone = `(${match[1]}) ${match[2]}`;
  }
  try {
    const supabase = createClient();
    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    updateData.user_metadata = {};
    if (name) updateData.user_metadata.name = name;
    if (formattedPhone) updateData.user_metadata.phone = formattedPhone;
    if (typeof disabled === 'boolean') updateData.disabled = disabled;
    const { data, error } = await supabase.auth.admin.updateUserById(id, updateData);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
  }
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
  }
  try {
    // Busca o usuário na tabela public.User pelo UUID
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({ where: { userId: id } });
    await prisma.$disconnect();
    if (!user || !user.role) {
      return NextResponse.json({ error: 'Usuário não encontrado ou sem papel definido.' }, { status: 404 });
    }
    // Retorna apenas a role do usuário
    return NextResponse.json({ role: user.role });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}