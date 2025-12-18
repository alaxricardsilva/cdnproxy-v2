# CDN Proxy v2 – Backend Go

Backend em Go responsável pela API principal do CDN Proxy v2, incluindo:

- autenticação via Supabase
- painel Admin e Superadmin
- gerenciamento de domínios, planos, usuários e pagamentos
- proxy de streaming com contagem de tráfego diário e mensal
- ferramentas de manutenção de banco para o Superadmin

---

## Stack e requisitos

- Go `1.25.5` (ver `backend/go.mod`)
- PostgreSQL compatível com Supabase (mesmo banco usado pelo Supabase)
- Variáveis de ambiente:
  - `SUPABASE_URL`
  - `SUPABASE_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL` (URL completa do Postgres usado pelo backend Go)
  - Demais chaves conforme `backend/config/config.go`

---

## Estrutura principal

Arquivos e pastas importantes:

- `main.go`: ponto de entrada do servidor HTTP (`:8080`)
- `handlers/`:
  - `handlers/login`: login e change password
  - `handlers/status`: rota de status da API
  - `handlers/streaming`: proxy de streaming, geolocalização, logs e tráfego
  - `handlers/admin`: rotas protegidas para usuários com role Admin
  - `handlers/superadmin`: rotas protegidas para Superadmin
  - `handlers/webhook`: Webhook MercadoPago
- `middleware/`:
  - `supabase_auth.go`: autenticação via JWT Supabase
  - `role_authorization.go`: autorização por role (`1` Superadmin, `2` Admin)
- `database/`:
  - `database.go`: conexão PGX e execução das migrações `.sql`
  - `migrations/*.sql`: migrações SQL (tabelas, ajustes, etc.)
- `models/models.go`: structs usadas para scan das tabelas do banco
- `test_backend_routes.go`: script Go para testar rapidamente as rotas da API

---

## Executando o backend

No diretório `backend/`:

```bash
go run main.go
```

O servidor:

- conecta no banco via `DATABASE_URL`
- executa todas as migrações SQL em `backend/database/migrations`
- sobe HTTP em `:8080`

Rotas principais:

- status: `GET /api/status`
- login: `POST /auth`
- streaming: `/api/streaming/...`
- admin: `/api/admin/...`
- superadmin: `/api/superadmin/...`
- webhook: `POST /webhook/mercadopago`

Em produção, o recomendado é colocar um proxy (Nginx/Traefik/Cloudflare Tunnel) na frente e expor apenas os domínios públicos (`api.cdnproxy.top`, domínios de streaming etc.).

---

## Autenticação e roles

### Login

- `POST /auth`
- Body:

```json
{
  "email": "email@exemplo.com",
  "password": "SenhaAqui"
}
```

- Resposta (resumida):

```json
{
  "access_token": "<JWT>",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "...",
    "email": "email@exemplo.com"
  }
}
```

### Uso do token

Todas as rotas Admin/Superadmin usam:

```http
Authorization: Bearer <access_token>
```

As roles (no banco Supabase) são:

- `1` – Superadmin
- `2` – Admin

O middleware `SupabaseAuth` valida o JWT com o JWKS do Supabase e `RoleAuthorization("1")`/`RoleAuthorization("2")` garante o acesso por role.

---

## Grupos de rotas principais

### Rotas públicas

- `GET /api/status`
- `GET /`
- `POST /webhook/mercadopago` (usada pelo MercadoPago, não pelo frontend)

### Streaming

- `GET/POST /api/streaming/proxy`
- `GET /api/streaming/geolocation?ip=...`
- `GET /api/utils/geolocation_original?ip=...`
- Domínios de streaming customizados apontam para `DomainProxyHandler` via host (ex.: `power.cdnproxy.top`).

Todas as respostas de streaming (exceto navegador) são contabilizadas em:

- `daily_traffics` (contagem de requests por dia)
- `monthly_traffic` (bytes de download/upload/bandwidth por usuário, mês e ano)
- `streaming_access_logs` (IP, país, device, etc.)

### Admin (`/api/admin`)

Principais rotas:

- `GET /api/admin/dashboard`
- `GET /api/admin/dashboard/data`
- `GET /api/admin/domains`
- `GET /api/admin/domains/renewal`
- `PUT /api/admin/domains/{id}` (atualiza apenas `target_url`)
- `GET /api/admin/profile`
- `PUT /api/admin/profile`
- `GET /api/admin/transactions`
- `GET /api/admin/cart`

### Superadmin (`/api/superadmin`)

Rotas principais:

- Dashboard:
  - `GET /api/superadmin/dashboard`
  - `GET /api/superadmin/dashboard/data`
- Domínios:
  - `GET /api/superadmin/domains`
  - `POST /api/superadmin/domains`
  - `GET /api/superadmin/domains/{id}`
  - `PUT /api/superadmin/domains/{id}`
  - `DELETE /api/superadmin/domains/{id}`
- Usuários:
  - `GET /api/superadmin/users`
  - `POST /api/superadmin/users/{id}/activate`
  - `POST /api/superadmin/users/{id}/deactivate`
- Planos:
  - `GET /api/superadmin/plans`
  - `POST /api/superadmin/plans`
  - `GET /api/superadmin/plans/{id}`
  - `PUT /api/superadmin/plans/{id}`
  - `DELETE /api/superadmin/plans/{id}`
- Pagamentos:
  - `GET /api/superadmin/payments`
  - `POST /api/superadmin/payments`
  - `GET /api/superadmin/payments/{id}`
  - `PUT /api/superadmin/payments/{id}`
  - `DELETE /api/superadmin/payments/{id}`
- Tráfego:
  - `GET /api/superadmin/traffic`
  - `GET /api/superadmin/traffic/{id}`
  - `POST /api/superadmin/traffic/reset`
- Configuração:
  - `GET /api/superadmin/configuration`
  - `PUT /api/superadmin/configuration`
  - `GET /api/superadmin/general_config`
  - `POST /api/superadmin/general_config`
  - `PUT /api/superadmin/general_config`
  - `DELETE /api/superadmin/general_config`
  - `GET /api/superadmin/analytics`
  - `GET /api/superadmin/mercadopago`
  - `PUT /api/superadmin/mercadopago`
  - `GET /api/superadmin/dashboard/traffic-chart`
- Banco de dados:
  - `GET /api/superadmin/database/status`
  - `POST /api/superadmin/database/clean`

Para detalhes de payloads, respostas e exemplos, consulte `DOCUMENTACAO_API.md`.

---

## Testes rápidos das rotas

No diretório `backend/`:

```bash
go run test_backend_routes.go
```

Esse script:

- faz login como Superadmin e Admin
- testa rotas públicas, de streaming, Admin e Superadmin
- executa um fluxo completo de CRUD de:
  - plano
  - domínio
  - pagamento
  - ativar/desativar usuário

Observações:

- O teste do webhook MercadoPago (`POST /webhook/mercadopago`) falhará com `403 Signature validation failed` enquanto o segredo/cabeçalho real não for configurado.

---

## Swagger é necessário?

Para este projeto, com backend mais enxuto em Go e documentação em Markdown, o uso de Swagger/OpenAPI não é obrigatório.

Vantagens de ficar apenas com Markdown e ferramentas como Postman/Insomnia:

- menos dependências
- menos código/arquivos para manter
- documentação pode ser escrita diretamente pensando no frontend e no uso real

Swagger pode ser considerado no futuro se for necessário:

- gerar SDKs automáticos para vários clientes
- expor um portal público de API para terceiros

No estado atual (backend para um frontend próprio), a combinação:

- `README.md` (visão geral e setup)
- `DOCUMENTACAO_API.md` (detalhe das rotas)

é suficiente e mais simples de manter.

