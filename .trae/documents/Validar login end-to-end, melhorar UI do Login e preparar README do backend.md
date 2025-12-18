## Objetivo
- Confirmar em modo dev que o login funciona e redireciona para o dashboard conforme ROLE.
- Melhorar a UI da página de login para um visual profissional.
- Preparar um README do backend após validação completa.
- Orientar sobre atualização do Ruby (3.4.x) e compatibilidade.

## Ações de Validação (Dev)
1. Ajustar consumo do backend no frontend em dev:
   - Adicionar `VITE_API_URL=http://localhost:3001` no `.env` do frontend e usar `fetch(`${import.meta.env.VITE_API_URL}/auth`, ...)`.
   - Alternativa: configurar proxy do Vite (`server.proxy`) para `/` → `http://localhost:3001`.
2. Subir backend em `:3001` usando `.env` já existente (SUPABASE_URL, JWKS, issuer dinâmico).
3. Subir frontend em `:3000` e executar fluxo:
   - Login via Supabase Auth.
   - POST `/auth` com JWT do Supabase.
   - Verificar resposta `200` com `role` e redirecionamentos.
4. Exercitar páginas protegidas (admin/superadmin) confirmando `Authorization: Bearer <jwt>` e `200`.

## Relatório de Verificação
- Registrar: status de `/auth`, role retornado, navegação, chamadas API protegidas, eventuais erros.
- Entregar um sumário objetivo confirmando funcionalidade e pontos checados.

## Melhorias de UI (Login)
1. Reorganizar botões em linha ("Entrar" e "Esqueci minha senha") com espaçamento adequado.
2. Ajustar hierarquia visual: cards, espaçamentos, tipografia; manter Tailwind.
3. Melhorar feedback de erro/sucesso com alertas mais discretos e consistentes.

## README do Backend
- Conteúdo:
  - Visão geral.
  - Requisitos (Ruby, Rails, PostgreSQL).
  - Configuração de ambiente (.env), `SUPABASE_URL`, JWKS/issuer dinâmicos.
  - Como rodar em desenvolvimento (porta, comandos).
  - Autenticação (JWT Supabase, headers).
  - Estrutura de rotas protegidas (admin/superadmin).
  - Dicas de troubleshooting (401, sincronização `auth_user_id`).

## Ruby 3.4.x
- Recomendação: manter Ruby 3.2.0 até validar compatibilidade (Rails 8.1 + gems).
- Plano de upgrade:
  - Atualizar `Gemfile` para `ruby "3.4.x"`.
  - Instalar e testar em ambiente de staging.
  - Verificar gems (puma, pg, jwt, dotenv, pundit) e eventuais deprecações.

Confirma para eu executar os passos acima: ajustar dev config do frontend/backend, validar E2E e redirecionamentos, aplicar a melhoria na UI do login e entregar o README do backend?