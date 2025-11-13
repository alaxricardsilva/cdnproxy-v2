import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// Adicione outros providers conforme necessário

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text", placeholder: "123456", optional: true },
      },
      async authorize(credentials) {
        // Implemente sua lógica de autenticação aqui
        // Exemplo: buscar usuário no banco e validar senha
        // Retorne o objeto do usuário se autenticado, ou null se falhar
        return null;
      },
    }),
    // ... outros providers
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/login?error=true",
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? "app.cdnproxy.top" : undefined,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET as string,
});