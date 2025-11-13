// Script automatizado para testar autenticação JWT Supabase no backend
// Instale as dependências antes: npm install @supabase/supabase-js axios

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configurações do Supabase
const SUPABASE_URL = 'https://hbiusfcqllxdhkatpjgf.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_Hy_UMwdaXXnBubpmp93Yxg_gSuq7ecA';

// Backend protegido
const BACKEND_URL = 'http://localhost:5001/streaming/iptv/1';

const users = [
  {
    role: 'SUPERADMIN',
    email: 'alaxricardsilva@gmail.com',
    password: 'Admin123',
  },
  {
    role: 'ADMIN',
    email: 'alaxricardsilva@outlook.com',
    password: 'Admin123',
  },
];

async function testUser(user) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  console.log(`\nTestando login para: ${user.role}`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    console.error(`Erro ao logar (${user.role}):`, error.message);
    return;
  }
  const jwt = data.session?.access_token;
  if (!jwt) {
    console.error(`JWT não encontrado para ${user.role}`);
    return;
  }
  console.log(`JWT obtido para ${user.role}:`, jwt.substring(0, 40) + '...');
  try {
    const response = await axios.get(BACKEND_URL, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });
    console.log(`Backend respondeu (${user.role}):`, response.status, response.data);
  } catch (err) {
    if (err.response) {
      console.error(`Backend respondeu (${user.role}):`, err.response.status, err.response.data);
    } else {
      console.error(`Erro ao conectar backend (${user.role}):`, err.message);
    }
  }
}

(async () => {
  for (const user of users) {
    await testUser(user);
  }
})();