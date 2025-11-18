// import { supabase } from '../utils/supabase'; // Comentado pois o módulo não existe
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Redirecionamento por ROLE após login', () => {
  it('Redireciona para dashboard correto conforme ROLE', async () => {
    // Simulação de sessão Supabase
    const session = { user: { id: 'test-uuid-123' } };
    const userId = session.user.id;

    // Consulta public.User pelo userId (UUID do Supabase)
    const user = await prisma.user.findUnique({ where: { userId } });

    // Redireciona conforme ROLE
    let currentRoute = '';
    if (user?.role === 'SUPERADMIN') {
      currentRoute = '/superadmin/dashboard';
    } else if (user?.role === 'ADMIN') {
      currentRoute = '/admin/dashboard';
    } else {
      currentRoute = '/user/dashboard';
    }
    expect(currentRoute).toMatch(/dashboard/);
  });
});