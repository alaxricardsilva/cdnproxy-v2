import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true, // Removido para evitar import automático de 'react/compiler-runtime'
  async rewrites() {
    return [
      // Não redireciona rotas do NextAuth
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },
      // Removido redirecionamento para backend antigo
      // Outras rotas podem ser tratadas aqui futuramente
    ];
  },
  // Removido bloco server inválido para Next.js 16+
};

// Corrigir erro dev indicator removendo dependências desnecessárias e ajustando configuração do Next.js
export default nextConfig;
