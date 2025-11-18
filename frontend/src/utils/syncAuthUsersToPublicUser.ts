import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Configure Supabase Client usando variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Função principal para sincronizar usuários do Supabase Auth para public.User
export async function syncAuthUsersToPublicUser() {
  // Busca todos os usuários do Supabase Auth
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error('Erro ao buscar usuários do Supabase Auth: ' + error.message);

  for (const authUser of data.users) {
    const email = authUser.email;
    if (!email) continue; // Ignora usuários sem e-mail
    const uuid = authUser.id;
    const name = authUser.user_metadata?.name || email;
    let role = 'ADMIN';
    if (email === 'alaxricardsilva@gmail.com') role = 'SUPERADMIN';
    else if (email === 'alaxricardsilva@outlook.com') role = 'ADMIN';

    // Upsert no public.User
    await prisma.user.upsert({
      where: { userId: uuid },
      update: { email, name, role },
      create: {
        userId: uuid,
        email,
        name,
        password: '', // senha gerenciada pelo Supabase Auth
        role,
      },
    });
  }
  await prisma.$disconnect();
  console.log('Sincronização concluída!');
}

// Para rodar manualmente via node:
(async () => { await syncAuthUsersToPublicUser(); })();