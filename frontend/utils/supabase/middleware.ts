import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { type NextRequest, NextResponse } from 'next/server';

export const createClient = (request: NextRequest) => {
  return createMiddlewareSupabaseClient({
    req: request,
    res: new NextResponse(),
  });
};