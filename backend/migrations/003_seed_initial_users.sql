
INSERT INTO public.users (email, supabase_auth_id, role, created_at, updated_at)
VALUES 
  ('alaxricardsilva@gmail.com', '61b06f22-5359-47e8-975c-f9824d7a0642', 1, NOW(), NOW()),
  ('alaxricardsilva@outlook.com', 'a9f43b5c-5061-41eb-aeb9-21d588c0db0d', 0, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  supabase_auth_id = EXCLUDED.supabase_auth_id,
  role = EXCLUDED.role,
  updated_at = NOW();
