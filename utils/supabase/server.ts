import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export const createClient = (context: any) => {
  return createPagesServerClient(context);
};