## Decisões
- Manter Ruby 3.2.x por estabilidade; planejar upgrade para 3.4.7 em staging após validação de gems e Rails.
- Backend escutando em 5001; Frontend em 3000.
- Login do frontend atualizado para um layout elegante similar à imagem anexada.

## Portas e Dev Setup
1. Backend (Rails/Puma):
   - Alterar `config/puma.rb` para `port ENV.fetch("PORT") { 5001 }`.
   - Garantir que `bin/rails s` em dev utilize `PORT=5001`.
2. Frontend (Vite):
   - Criar `vite.config.js` com `server.port = 3000` e `server.proxy` para `http://localhost:5001` (proxy para `/auth` e demais rotas do backend), ou manter `VITE_API_URL=http://localhost:5001` se preferir sem proxy.
   - Atualizar `.env` do frontend para `VITE_API_URL=http://localhost:5001`.

## UI do Login (elegante)
1. Estrutura:
   - Card central escuro (dark) com bordas arredondadas, sombra suave e largura máxima balanceada.
   - Logo superior (usar `/vite.svg` ou `/background-blur.jpg` já existentes; opcionalmente adicionar `/dns.svg` se necessário).
   - Título “Sistema DNS” e subtítulo descritivo.
   - Labels "Email" e "Senha" acima dos inputs.
   - Inputs com preenchimento claro, cantos arredondados, foco com `ring` leve.
   - Botão principal “Entrar” largo com gradiente azul, hover suave.
   - Mensagens de erro/sucesso discretas.
2. Implementação:
   - Editar `src/views/LoginView.vue` para o novo layout.
   - Ajustar classes Tailwind e remover elementos que poluam o design.

## Verificações
1. Subir backend em 5001 e frontend em 3000; testar login Supabase → `/auth` → redirecionamento por ROLE.
2. Confirmar requests protegidas (admin/superadmin) com `Authorization: Bearer` retornando 200.
3. Relatório final com status e evidências (respostas 200, navegação, ausência de erros).

## Ruby 3.4.7 (Plano de Upgrade)
1. Atualizar `Gemfile` para `ruby "3.4.7"` em branch de staging.
2. Executar `bundle update` e suíte de testes; validar gems (`pg`, `puma`, `jwt`, `dotenv`, `pundit`).
3. Ajustar eventuais deprecações e só então promover para produção.

Confirma para eu executar: ajustar portas (5001/3000), atualizar a UI do login para o visual elegante e validar end‑to‑end com relatório final?