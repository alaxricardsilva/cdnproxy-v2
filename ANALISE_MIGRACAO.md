# Relatório de Análise e Planejamento de Migração (Backend Completo)

Este documento mapeia **TODAS** as rotas existentes no Backend Go, incluindo Superadmin, Streaming, Webhook e Admin, detalhando como elas devem ser integradas ao novo Frontend Next.js.

---

## 🌎 1. Rotas de Entrada (Públicas/Mistura)

Essas rotas manipulam entradas que não exigem login de superadmin ou admin, como webhooks de pagamento ou controle de proxy.

| Método | Rota Backend (Go) | Função | Sugestão Frontend (Next.js) |
| :--- | :--- | :--- | :--- |
| `ALL` | `/` | **Proxy Reverso Principal**. Intercepta requisições vindas de domínios (Ex: `video.com`). Se for `app.` ou `api.`, redireciona para a API. | *Sem ação no Frontend*. Isso é lógica de servidor (Middleware Go). |
| `POST` | `/webhook/mercadopago` | Recebe notificações de pagamento do MercadoPago. | *Sem ação no Frontend*. (Backend only). |
| `GET` | `/api/status` | Healthcheck da API. | Pode ser usado em uma página `/status` pública se desejar. |
| `POST` | `/auth` | Login (Email/Senha). | Página `/login` |
| `GET` | `/api/auth/me` | Retorna dados do usuário logado. | Hook de Auth (`useUser`) |
| `POST` | `/api/public/change_password` | Alteração de senha. | Modal/Página "Esqueci minha senha" |

---

## 📹 2. Módulo de Streaming (`/api/streaming/*`)

Essas rotas gerenciam os proxies de vídeo e geolocalização.

| Método | Rota Backend (Go) | Função | Integração Frontend |
| :--- | :--- | :--- | :--- |
| `GET/POST`| `/api/streaming/proxy` | Lógica interna do proxy de vídeo. | *Backend Only*. O Frontend não consome isso diretamente. |
| `GET` | `/api/streaming/geolocation` | Retorna dados de geo (país/cidade) baseados no IP. | **Novo Componente**: Pode ser usado no Dashboard para mostrar "Sua localização atual: [Bandeira] Brasil". |
| `GET` | `/api/utils/geolocation_original`| Alias para geolocation. | *Descontinuar* (usar a rota acima). |

---

## 🛡️ 3. Módulo Admin (Cliente Final) (`/api/admin/*`)

Painel para o cliente gerenciar seus domínios e assinaturas.

| Método | Rota Backend (Go) | Função | Página Next.js Sugerida |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Resumo da conta. | `/dashboard` (Home) |
| `GET` | `/dashboard/data` | Estatísticas do usuário. | `/dashboard` (Cards) |
| `GET` | `/domains` | Lista domínios do usuário. | `/admin/domains` (Lista) |
| `PUT` | `/domains/{id}` | Atualiza domínio. | `/admin/domains/[id]` |
| `GET` | `/transactions` | Histórico de pagamentos. | `/admin/billing` |
| `GET` | `/cart` | Carrinho de compras (?). | `/admin/cart` |
| `POST` | `/cart` | Adicionar itens. | Botão "Comprar Plano" |
| `GET` | `/profile` | Dados pessoais. | `/admin/settings` |
| `PUT` | `/profile` | Atualizar dados. | `/admin/settings` (Formulário) |

---

## 👑 4. Módulo Superadmin (Gestão Completa) (`/api/superadmin/*`)

Este é o núcleo da gestão do sistema.

### 📊 Dashboard & Analytics
| Método | Rota | O que retorna | Componente/Página Next.js |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard` | Resumo simples. | `/superadmin` (Home) |
| `GET` | `/dashboard/data` | Counts (Domains, Expiring). | **Top Cards** (Dashboard) |
| `GET` | `/analytics` | Revenue, Total Users. | **Business Cards** (Dashboard) |
| `GET` | `/dashboard/traffic-chart` | Dados para gráfico. | **Componente Recharts** (Line Chart) |
| `GET` | `/traffic` | Lista bruta de tráfego. | Tabela detalhada de tráfego `/superadmin/traffic` |
| `GET` | `/traffic/{id}` | Detalhe de tráfego. | Modal de detalhe |
| `POST` | `/traffic/reset` | Zera estatísticas. | Botão "Resetar Stats" (Zona de Perigo) |

### 👥 Gestão de Usuários
| Método | Rota | O que retorna | Componente/Página Next.js |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | Lista todos os usuários. | `/superadmin/users` (Data Table com busca) |
| `POST` | `/users/{id}/activate` | Ativa usuário. | Action "Ativar" na tabela |
| `POST` | `/users/{id}/deactivate` | Desativa usuário. | Action "Bloquear" na tabela |

### 🌐 Gestão de Domínios
| Método | Rota | O que retorna | Componente/Página Next.js |
| :--- | :--- | :--- | :--- |
| `GET` | `/domains` | Todos os domínios do sistema. | `/superadmin/domains` (Data Table Global) |
| `POST` | `/domains` | Cria novo domínio. | Botão "Novo Domínio" + Modal |
| `GET` | `/domains/{id}` | Detalhes. | `/superadmin/domains/[id]` |
| `PUT` | `/domains/{id}` | Edita. | Formulário de Edição |
| `DELETE`| `/domains/{id}` | Remove. | Alert Dialog (Confirmação) |

### 💰 Pagamentos & Planos
| Método | Rota | O que retorna | Componente/Página Next.js |
| :--- | :--- | :--- | :--- |
| `GET` | `/payments` | Lista todas as transações. | `/superadmin/finance/payments` |
| `GET` | `/payments/{id}` | Detalhe da transação. | Modal |
| `GET` | `/plans` | Lista planos disponíveis. | `/superadmin/finance/plans` |
| `POST` | `/plans` | Cria novo plano. | Modal "Criar Plano" |
| `PUT` | `/plans/{id}` | Edita plano. | Modal de Edição |
| `DELETE`| `/plans/{id}` | Remove plano. | Botão Delete |
| `GET/PUT`| `/mercadopago` | Configurações MP. | `/superadmin/settings/payment` |

### ⚙️ Configurações do Sistema
| Método | Rota | O que retorna | Componente/Página Next.js |
| :--- | :--- | :--- | :--- |
| `GET` | `/database/status` | Status do DB (tamanho, conexões). | `/superadmin/system/health` (Dashboard Server) |
| `POST` | `/database/clean` | Limpeza de logs antigos. | Botão "Otimizar Banco de Dados" |
| `GET/PUT`| `/cloudflare/config` | Keys e Emails da Cloudflare. | `/   superadmin/settings/cloudflare` |
| `GET/PUT`| `/configuration` | Configs gerais (SMTP, etc). | `/superadmin/settings/general` |
| `GET/PUT`| `/general_config` | Outras configs globais. | `/superadmin/settings/advanced` |
| `POST` | `/mail` | Dispara email de teste/mkt. | `/superadmin/tools/email-sender` |

---

## 🚀 5. Novas Funcionalidades (Cache & Monitoring)

Como analisado anteriormente, o Backend já coleta dados ricos em `streaming_access_logs`.

### Nova Página: Monitoramento de IPs (`/superadmin/monitoring/ips`)
Para implementar a "Página de Cache" solicitada:

1.  **Backend (Ação Necessária)**:
    *   Criar Rota `GET /api/superadmin/access-logs`.
    *   Query: `SELECT client_ip, count(*) as hits, country_name, device_type FROM streaming_access_logs GROUP BY client_ip` ou listagem bruta paginada.

2.  **Frontend (Next.js)**:
    *   **Live Stream Table**: Tabela que atualiza a cada 5s.
    *   **Colunas**: IP, Localização (Geo), ISP (Se disponível no geo), Dispositivo, Último Acesso.
    *   **Filtros**: Por País, Por Domínio.
