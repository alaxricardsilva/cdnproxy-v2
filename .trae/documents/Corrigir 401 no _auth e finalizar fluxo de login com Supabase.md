## Diagnóstico
- O 401 no `/auth` acontece porque o backend valida o JWT com JWKS/issuer de outro projeto Supabase.
- Evidência: `backend/app/controllers/concerns/jwt_authenticator.rb:7-9` usa `bukbsnqmujezlfovabzq.supabase.co`, enquanto o frontend usa `vpfdttgdfshvabliicyb.supabase.co` (linha `LoginView.vue:77`). Tokens emitidos por `vpfd...` são inválidos contra JWKS/issuer de `bukbs...`.
- Possível segundo fator: mesmo com JWT válido, se `users.auth_user_id` não estiver sincronizado com o `sub` do JWT, o backend retornará 401 “Usuário não encontrado”.

## Correções de Backend
1. Tornar JWKS/issuer dinâmicos via ENV:
   - Ler `SUPABASE_URL` e compor `JWKS_URL = #{SUPABASE_URL}/auth/v1/.well-known/jwks.json` e `ISSUER = #{SUPABASE_URL}/auth/v1`.
   - Remover valores hardcoded em `jwt_authenticator.rb`.
2. Padronizar proteção:
   - Garantir `include JwtAuthenticator` + `before_action :authenticate_jwt!` em todos os controllers de rotas protegidas (`admin/*`, `superadmin/*`, etc.).
   - Manter `/auth#create` sem `before_action`, mas com validação interna já existente.
3. Melhorar robustez da validação:
   - Manter `algorithms: ['RS256']`, `verify_iss: true` e tolerar falta de `aud` (como hoje), sem alterar claims.

## Sincronização de Usuários
1. Atualizar a tabela `users` para vincular `auth_user_id` ao `sub` do Supabase Auth:
   - Obter o `id` (sub) dos usuários via Supabase Admin API usando `SUPABASE_SERVICE_ROLE_KEY`.
   - Atualizar:
     - `alaxricardsilva@gmail.com` → role `SUPERADMIN`.
     - `alaxricardsilva@outlook.com` → role `ADMIN`.
2. Validar que, após o login, `User.find_by(auth_user_id: payload['sub'])` encontra o usuário.

## Correções de Frontend
1. Confirmar `.env` do frontend:
   - `VITE_SUPABASE_URL=https://vpfdttgdfshvabliicyb.supabase.co`.
   - `VITE_SUPABASE_API_KEY=<publishable>`.
   - Sem `SUPABASE_JWT_SIGNING_KEY` no frontend.
2. Garantir que todas as chamadas usam `Authorization: Bearer <jwt>` (já verificado).

## Testes e Verificação
1. Reiniciar backend com `SUPABASE_URL` correto e rodar:
   - Login com `SUPERADMIN` e `ADMIN`.
   - Chamar `/auth` e confirmar `200` com role.
   - Verificar redirecionamento para `/superadmin/dashboard` e `/admin/dashboard`.
2. Exercitar páginas protegidas (admin/superadmin) e confirmar `200` com JWT válido.
3. Observar logs:
   - Confirmar que o 401 anterior não ocorre mais.
   - Ver mensagens claras de erro quando o usuário não estiver sincronizado.

## Entregáveis
- Atualização no `jwt_authenticator.rb` para usar ENV.
- Ajustes nos controllers protegidos para usar `authenticate_jwt!`.
- Sincronização dos dois usuários (SUPERADMIN e ADMIN) com `auth_user_id`.
- Validação end-to-end com prints de resposta e logs.

Confirma a execução do plano? Ao confirmar, aplico as mudanças e rodo os testes para você acompanhar os logs em tempo real.