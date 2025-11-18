import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/client';

export async function GET(req: NextRequest) {
  console.log('[API] GET /api/users chamado');
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('[API] GET /api/users: erro', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log('[API] GET /api/users: usuários encontrados', data.users.length);
    return NextResponse.json(data.users);
  } catch (err: any) {
    console.error('[API] GET /api/users: erro', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const { email, password, user_metadata } = body;
    const { data, error } = await supabase.auth.admin.createUser({ email, password, user_metadata });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data.user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const { id, email, user_metadata } = body;
    const { data, error } = await supabase.auth.admin.updateUserById(id, { email, user_metadata });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data.user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const { id } = body;
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}