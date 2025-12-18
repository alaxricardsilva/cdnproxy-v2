# CDN Proxy v2 – Documentação da API (Backend Go)

Documentação detalhada das rotas expostas pelo backend Go (`main.go`), focada no consumo pelo frontend (Admin/Superadmin) e pelos domínios de streaming.

---

## Autenticação

### Login

- **Endpoint**: `POST /auth`
- **Descrição**: autentica usando Supabase Auth e retorna um `access_token` (JWT).
- **Body (JSON)**:

```json
{
  "email": "email@exemplo.com",
  "password": "SenhaAqui"
}
```

- **Resposta 200 (exemplo real, resumido)**:

```json
{
  "access_token": "<JWT>",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "....",
  "user": {
    "id": "88e9f154-ae72-40cb-8794-4e766c3101b8",
    "email": "email@exemplo.com"
  }
}
```

### Cabeçalho de autorização

Para todas as rotas protegidas (Admin e Superadmin):

```http
Authorization: Bearer <access_token>
```

### Roles

- **Superadmin**: role `1`
- **Admin**: role `2`

As rotas Admin usam `RoleAuthorization("2")`.  
As rotas Superadmin usam `RoleAuthorization("1")`.

---

## Rotas públicas

### Status da API

- **Endpoint**: `GET /api/status`
- **Descrição**: verifica conexão com o banco e conectividade externa.
- **Resposta 200 (exemplo)**:

```json
{
  "status": "ok",
  "database_connected": true,
  "database_latency_ms": 12,
  "internet_connectivity": true
}
```

### Raiz (`/`)

- **Endpoint**: `GET /`
- **Comportamento**:
  - se o `Host` começa com `app.` ou `api.`: retorna uma mensagem simples `API CDN Proxy Online! - Status:200`
  - se for outro host: é encaminhado para o `DomainProxyHandler` (streaming/domínios).

### Webhook MercadoPago

- **Endpoint**: `POST /webhook/mercadopago`
- **Descrição**: recebe notificações do MercadoPago.
- **Observação**: em ambiente de desenvolvimento/teste, sem cabeçalho de assinatura correto, retorna `403 Signature validation failed`.  
  Não é usado diretamente pelo frontend, e sim pela integração do gateway.

---

## Streaming

### Proxy por nome (API)

- **Endpoint**: `POST /api/streaming/proxy`
- **Autenticação**: geralmente Superadmin (para testes), mas em produção o consumo é pelo domínio direto.
- **Body (JSON)**:

```json
{
  "name": "power.cdnproxy.top",
  "path": "/get.php?username=XXX&password=YYY&type=m3u_plus&output=hls"
}
```

- **Comportamento**:
  - Busca em `streaming_proxies` o proxy ativo ligado ao domínio `domains.dominio = name`.
  - Se não existir, cria automaticamente a partir de `domains.target_url`.
  - Se `User-Agent` for navegador:
    - retorna página HTML de status (caveira / 404 estilizado).
  - Se for dispositivo de streaming:
    - faz proxy reverso transparente para a URL de destino, preservando path e query.
    - em caso de erro do proxy, faz fallback com redirecionamento `301` para a URL de destino.

- **Efeitos colaterais (banco)**:
  - grava em `streaming_access_logs` (IP, user-agent, device, geolocalização).
  - incrementa `daily_traffics` (campo `trafego` por dia).
  - atualiza `monthly_traffic` (download/upload/bandwidth/requests) por `user_id` do dono do domínio.

### Proxy por host (domínios de streaming)

- **Endpoint**: qualquer caminho sob o host de streaming, ex:

```text
GET http://power.cdnproxy.top/get.php?username=...&password=...&type=m3u_plus&output=hls
```

- **Fluxo**:
  - `main.go` detecta o host (`power.cdnproxy.top`) e encaminha para `DomainProxyHandler`.
  - `DomainProxyHandler` monta internamente:

```json
{
  "name": "<host>",
  "path": "<request_uri>"
}
```

  - e chama o mesmo `handleProxy` descrito acima.

### Geolocalização via streaming

- **Endpoint**: `GET /api/streaming/geolocation?ip=8.8.8.8`
- **Descrição**: retorna dados de geolocalização para IP.

- **Endpoint**: `GET /api/utils/geolocation_original?ip=8.8.8.8`
- **Descrição**: rota utilitária mapeada para o mesmo handler, útil para compatibilidade.

---

## Rotas Admin (`/api/admin`) – role 2

### Dashboard

- **Endpoint**: `GET /api/admin/dashboard`
- **Descrição**: resumo do usuário Admin logado.
- **Resposta 200 (exemplo simplificado)**:

```json
{
  "total_users": 0,
  "total_domains": 3,
  "total_transactions": 5,
  "total_revenue": 199.9
}
```

- **Endpoint**: `GET /api/admin/dashboard/data`
- **Descrição**: dados detalhados para gráficos e cards do painel Admin (domínios ativos, vencendo, etc.).

### Domínios do Admin

- **Endpoint**: `GET /api/admin/domains`
- **Descrição**: lista domínios pertencentes ao usuário logado.
- **Resposta 200 (exemplo)**:

```json
[
  {
    "id": 1,
    "name": "power.cdnproxy.top",
    "dominio": "power.cdnproxy.top",
    "target_url": "http://ppwrk.sbs",
    "user_id": 28,
    "plan_id": 3,
    "expired_at": "2080-12-31T00:00:00Z",
    "active": true,
    "domain_type": "streaming"
  }
]
```

- **Endpoint**: `GET /api/admin/domains/renewal`
- **Descrição**: lista domínios próximos do vencimento para o usuário atual.

### Atualizar domínio (Admin)

- **Endpoint**: `PUT /api/admin/domains/{id}`
- **Descrição**: permite o Admin atualizar **apenas a `target_url`** do domínio.
- **Body (JSON)**:

```json
{
  "target_url": "http://nova-url-de-destino.com"
}
```

### Perfil Admin

- **Endpoint**: `GET /api/admin/profile`
- **Descrição**: retorna dados básicos do usuário logado.

- **Endpoint**: `PUT /api/admin/profile`
- **Descrição**: permite atualizar campos básicos (como email).
- **Body (JSON)**:

```json
{
  "email": "novo-email@exemplo.com"
}
```

### Transações e carrinho

- **Endpoint**: `GET /api/admin/transactions`
- **Descrição**: lista transações do Admin logado.

- **Endpoint**: `GET /api/admin/cart`
- **Descrição**: retorna o carrinho atual.

Outras operações no carrinho (POST/PUT/DELETE) são suportadas no handler, mas podem ser expostas no frontend conforme necessidade.

---

## Rotas Superadmin (`/api/superadmin`) – role 1

### Dashboard

- **Endpoint**: `GET /api/superadmin/dashboard`
- **Descrição**: resumo geral (total de usuários, domínios, transações, receita).

- **Endpoint**: `GET /api/superadmin/dashboard/data`
- **Descrição**: dados mais detalhados (domínios ativos/inativos, expirando, etc.).

### Domínios

- **Listar domínios**
  - `GET /api/superadmin/domains`
  - Retorna todos os domínios com campos como `id`, `name`, `dominio`, `target_url`, `user_id`, `plan_id`, `expired_at`, `active`.

- **Criar domínio**
  - `POST /api/superadmin/domains`
  - **Body (exemplo)**:

```json
{
  "name": "power.cdnproxy.top",
  "dominio": "power.cdnproxy.top",
  "user_id": 28,
  "plan_id": 3,
  "expired_at": "2080-12-31T00:00:00Z",
  "target_url": "http://ppwrk.sbs"
}
```

  - **Resposta 201**: domínio criado (JSON do domínio).

- **Buscar domínio por ID**
  - `GET /api/superadmin/domains/{id}`

- **Atualizar domínio**
  - `PUT /api/superadmin/domains/{id}`
  - Pode alterar `dominio`, `target_url`, `plan_id`, `expired_at`, `active`, etc.

- **Excluir domínio**
  - `DELETE /api/superadmin/domains/{id}`
  - **Resposta**: `204 No Content` em caso de sucesso.

### Usuários

- **Listar usuários**
  - `GET /api/superadmin/users`

- **Ativar usuário**
  - `POST /api/superadmin/users/{id}/activate`

- **Desativar usuário**
  - `POST /api/superadmin/users/{id}/deactivate`

### Planos

- **Listar planos**
  - `GET /api/superadmin/plans`

- **Criar plano**
  - `POST /api/superadmin/plans`
  - **Body (exemplo)**:

```json
{
  "name": "Plano Suporte",
  "price": 49.9,
  "description": "Plano com suporte estendido"
}
```

- **Buscar plano**
  - `GET /api/superadmin/plans/{id}`

- **Atualizar plano**
  - `PUT /api/superadmin/plans/{id}`

- **Excluir plano**
  - `DELETE /api/superadmin/plans/{id}`

### Pagamentos

- **Listar pagamentos**
  - `GET /api/superadmin/payments`

- **Criar pagamento**
  - `POST /api/superadmin/payments`
  - **Body (exemplo)**:

```json
{
  "user_id": 28,
  "plan_id": 3,
  "amount": 49.9,
  "status": "pending",
  "payment_method": "manual",
  "paid_at": "2025-12-14T20:15:00Z"
}
```

- **Buscar pagamento**
  - `GET /api/superadmin/payments/{id}`

- **Atualizar pagamento**
  - `PUT /api/superadmin/payments/{id}`

- **Excluir pagamento**
  - `DELETE /api/superadmin/payments/{id}`

### Tráfego

- **Tráfego diário (lista)**
  - `GET /api/superadmin/traffic`
  - Lê dados da tabela `daily_traffics` (id, date, trafego, created_at, updated_at).
  - Quando não há registros, pode retornar `null` (lista vazia).

- **Tráfego diário (detalhe)**
  - `GET /api/superadmin/traffic/{id}`

- **Resetar tabelas de tráfego**
  - `POST /api/superadmin/traffic/reset`
  - Limpa as tabelas:
    - `daily_traffics`
    - `monthly_traffic`
  - **Resposta**: `204 No Content`

- **Gráfico de tráfego (últimos 30 dias)**
  - `GET /api/superadmin/dashboard/traffic-chart`
  - Usa `daily_traffics` e retorna algo como:

```json
[
  { "date": "10/12/2025", "trafego": 12 },
  { "date": "11/12/2025", "trafego": 30 }
]
```

### Configuração geral

- **Configurações de interface (nome do site, logo, etc.)**
  - `GET /api/superadmin/configuration`
  - `PUT /api/superadmin/configuration`

- **Configurações gerais (chave/valor)**
  - `GET /api/superadmin/general_config`
  - `POST /api/superadmin/general_config`
  - `PUT /api/superadmin/general_config`
  - `DELETE /api/superadmin/general_config`

### Analytics e MercadoPago

- **Analytics simples**
  - `GET /api/superadmin/analytics`
  - Retorna total de usuários, total de pagamentos, soma de receita etc.

- **Config MercadoPago**
  - `GET /api/superadmin/mercadopago`
  - `PUT /api/superadmin/mercadopago`

### Banco de dados (ferramentas de manutenção)

- **Status das tabelas**
  - **Endpoint**: `GET /api/superadmin/database/status`
  - **Resposta (exemplo real)**:

```json
{
  "tables": [
    { "name": "users", "rows": 2 },
    { "name": "domains", "rows": 1 },
    { "name": "streaming_access_logs", "rows": 27 },
    { "name": "daily_traffics", "rows": 1 },
    { "name": "monthly_traffic", "rows": 0 }
  ]
}
```

- **Limpar dados de tráfego**
  - **Endpoint**: `POST /api/superadmin/database/clean`
  - **Body opcional**:

```json
{
  "tables": ["daily_traffics", "monthly_traffic"]
}
```

  - Se `tables` não for enviado, o padrão é limpar:
    - `daily_traffics`
    - `monthly_traffic`
  - **Resposta**:

```json
{ "success": true }
```

Somente essas tabelas são aceitas; qualquer outro nome é ignorado pelo backend, garantindo que rotas de limpeza não apaguem tabelas críticas.

---

## Notas sobre Swagger/OpenAPI

Atualmente, esta API em Go é usada por um frontend próprio e já possui:

- testes automatizados de rotas em `test_backend_routes.go`
- documentação em Markdown (`README.md` e este `DOCUMENTACAO_API.md`)

Nessa situação, manter Swagger/OpenAPI **não é obrigatório** e traria:

- mais arquivos para versionar (esquemas OpenAPI)
- necessidade de manter a especificação sempre sincronizada com o código Go

Por isso, o modelo recomendado para este projeto é:

- documentação em Markdown (simples de editar)
- coleções Postman/Insomnia para testes manuais (se desejado)

Swagger/OpenAPI pode ser adotado futuramente se:

- for exposta uma API pública para terceiros
- for necessário gerar SDKs automaticamente para vários clientes

Mas, para o caso atual (frontend próprio consumindo a API), as especificações em Markdown são suficientes e mais fáceis de manter.

