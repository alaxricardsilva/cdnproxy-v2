import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = typeof window !== "undefined"
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  : process.env.SUPABASE_SECRET_KEY as string;

export const createClient = () =>
  createSupabaseClient(
    supabaseUrl,
    supabaseKey,
  );