# CDN Proxy - Frontend

Este é o painel administrativo do CDN Proxy v2, construído com **Next.js 16**, **Tailwind CSS** e **Shadcn/UI**.

## 🚀 Tecnologias

- [Next.js](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) (Gráficos)
- [Lucide & Tabler Icons](https://lucide.dev/)

## 🛠️ Como Rodar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   # ou
   yarn install
   ```

2. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env.local` na raiz da pasta `frontend` e defina a URL do seu backend:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3030](http://localhost:3030).

## ☁️ Como Deployar na Vercel

Este projeto é otimizado para a [Vercel](https://vercel.com).

1. Faça o push deste repositório para o seu **GitHub**.
2. Faça login na **Vercel** e clique em **"Add New..."** > **"Project"**.
3. Importe o repositório do `frontend` (ou a raiz, e configure o *Root Directory* para `frontend`).
4. **Environment Variables**: Na tela de configuração da Vercel, adicione:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://app.cdnproxy.top` (ou a URL HTTPS do seu Backend Go)
5. Clique em **Deploy**.

> **Nota:** O Backend Go deve estar rodando em um servidor VPS e aceitar requisições do domínio da Vercel (CORS configurado).

## 📂 Estrutura de Pastas

- `/src/app`: Páginas e Rotas (App Router)
- `/src/components`: Componentes Reutilizáveis (UI)
- `/src/lib`: Utilitários e Configuração de API
- `/src/hooks`: Hooks Customizados (ex: useAuth)
