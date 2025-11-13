import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string;

export const createClient = () => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookieOptions: {
        // Customize cookie options if needed
        secure: true,
        sameSite: 'Lax',
      },
    }
  );
};