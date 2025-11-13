import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string;

export const createClient = (request: NextRequest) => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookieOptions: {
        secure: true,
        sameSite: 'Lax',
      },
    }
  );
};