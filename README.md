# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.



- Material UI para layout e componentes.
- React Table para logs e tabelas.
- Recharts para gráficos de analytics.
- SWR ou React Query para fetch dos dados do backend.

- React Table Para tabelas dinâmicas e filtráveis.
- Recharts / Victory / Nivo Para gráficos e visualizações de dados.
- React Icons Para ícones bonitos e fáceis de usar.

- Pages/Components: Separe páginas e componentes reutilizáveis.
- Hooks personalizados: Para fetch de dados, autenticação, etc.
- SWR ou React Query: Para gerenciamento de dados dinâmicos.
- React Icons: Para ícones bonitos e fáceis de usar.
- Tema global: Use ThemeProvider para tema escuro.

### Material UI
Principais pontos para modernizar:

- Use o sistema de temas do Material UI para aplicar dark mode e cores personalizadas.
- Utilize componentes como Drawer, AppBar, Card, Grid, Typography, Avatar, IconButton, List, etc.
- Para gráficos, integre bibliotecas como Recharts ou Chart.js (gratuitas).
- Cards com sombras, bordas arredondadas e ícones coloridos dão um visual mais sofisticado.
- Menu lateral (Drawer) com ícones, avatar do usuário, animações e responsividade.
- Use o sistema de Grid para organizar cards, tabelas e gráficos de forma responsiva.
Exemplo de estrutura moderna para o layout principal:

- AppBar no topo com logo, avatar, notificações.
- Drawer lateral com navegação, ícones, avatar.
- Área principal com Grid para cards, tabelas e gráficos.

Verificar se todas as páginas esta seguindo o Material UI v7 e se todos componentes estão corretos, e sem nenhum erro que sera dados no build.


Buscar no porjeto anterior as informações que tem no perfil do admin para que possa migrar para o novo projeto, incluindo a opção de ativar e destativar o 2FA que gera o QR Code e o código para confirmar, e a mesma coisa tem que colocar na página do superadmin.

Indentificar os principais componentes e padrões usados da página de configuração ou superadmin/config e do admin/profile do projeto antigo que usava o Nuxt.JS + Naive UI para migrar para o novo frontend com Material UI v7, e já pode fazer e depois a migração seguindo os padrões do Material UI v7, para não dar erros.