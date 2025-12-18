# 📚 Índice Geral da Documentação - CDN Proxy Backend

> Documentação completa e estruturada do backend do CDN Proxy  
> **Versão:** 1.2.2 | **Data:** 25/10/2025

---

## 🎯 Navegação Rápida

| Documento | Descrição | Para quem? |
|-----------|-----------|------------|
| [📘 Documentação Completa](#-documentação-completa) | Visão geral completa do backend | Todos |
| [🌐 APIs Detalhadas](#-apis-detalhadas) | Documentação de todos os endpoints | Desenvolvedores Frontend |
| [🏗️ Diagramas de Arquitetura](#️-diagramas-de-arquitetura) | Diagramas visuais do sistema | Arquitetos/DevOps |
| [🚀 Guia Rápido](#-guia-rápido) | Referência rápida para devs | Desenvolvedores Backend |

---

## 📘 Documentação Completa

**Arquivo:** `DOCUMENTACAO_BACKEND_COMPLETA.md`

### Conteúdo

1. **Visão Geral**
   - Características principais
   - Tecnologias utilizadas
   - Arquitetura geral

2. **Configuração**
   - Variáveis de ambiente
   - Configuração do Nuxt
   - Package.json

3. **Autenticação e Autorização**
   - Sistema híbrido (JWT + Supabase)
   - Funções de autenticação
   - Fluxo de autenticação

4. **APIs - Resumo**
   - 200+ endpoints organizados por grupo
   - Autenticação, Domínios, Analytics
   - Pagamentos, Admin, Superadmin, Sistema

5. **Utilitários**
   - Logger
   - Geolocation Service
   - Analytics Collector
   - Background Tasks
   - Alerts Manager
   - Payment Clients
   - Plan Validation
   - Redis Client

6. **Middlewares**
   - CORS Middleware
   - HTTPS Redirect

7. **Sistemas Especializados**
   - Sistema de Analytics
   - Sistema de Pagamentos
   - Sistema de Alertas
   - Tarefas em Background
   - Logging

8. **Deploy e Docker**
   - Dockerfile multi-stage
   - Docker Compose
   - Health checks

9. **Troubleshooting**
   - Problemas comuns
   - Health checks
   - Logs úteis

**📖 [Ver Documentação Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md)**

---

## 🌐 APIs Detalhadas

**Arquivo:** `DOCUMENTACAO_APIS_DETALHADAS.md`

### Conteúdo Detalhado

#### 1. Autenticação (Auth)
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/token` - Gerar token JWT
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/2fa/setup` - Configurar 2FA
- `POST /api/auth/2fa/verify` - Verificar código 2FA

#### 2. Domínios (Domains)
- `GET /api/domains` - Listar domínios
- `POST /api/domains` - Criar domínio
- `GET /api/domains/:id` - Detalhes do domínio
- `PUT /api/domains/:id` - Atualizar domínio
- `DELETE /api/domains/:id` - Deletar domínio

#### 3. Analytics
- `GET /api/analytics/overview` - Visão geral
- `GET /api/analytics/:domainId` - Analytics por domínio
- `GET /api/analytics/bandwidth` - Uso de banda
- `GET /api/analytics/geo` - Geolocalização
- `POST /api/analytics/collect-access-log` - Coletar log

#### 4. Pagamentos (Payments)
- `POST /api/payments/create` - Criar pagamento
- `GET /api/payments/list` - Listar pagamentos
- `GET /api/payments/history` - Histórico
- `POST /api/payments/webhook` - Webhook

#### 5. Planos (Plans)
- `GET /api/plans` - Listar planos
- `GET /api/plans/public` - Planos públicos
- `POST /api/plans/upgrade` - Fazer upgrade

#### 6. Administração (Admin)
- `GET /api/admin/profile` - Perfil admin
- `GET /api/admin/domains` - Domínios (visão admin)
- `GET /api/admin/payments` - Pagamentos (visão admin)

#### 7. Superadmin
- `GET /api/superadmin/stats` - Estatísticas globais
- `GET /api/superadmin/system-health` - Saúde do sistema
- `GET /api/superadmin/performance` - Performance

#### 8. Sistema (System)
- `GET /api/system/health` - Health check
- `GET /api/system/monitoring` - Monitoramento
- `POST /api/system/cleanup` - Limpeza de dados
- `GET /api/system/background-tasks` - Tarefas em background

### Inclui

- ✅ Request/Response completos
- ✅ Headers necessários
- ✅ Query parameters
- ✅ Códigos de status HTTP
- ✅ Exemplos práticos
- ✅ Rate limiting
- ✅ Paginação e filtros

**📖 [Ver APIs Detalhadas](./DOCUMENTACAO_APIS_DETALHADAS.md)**

---

## 🏗️ Diagramas de Arquitetura

**Arquivo:** `DIAGRAMAS_ARQUITETURA_BACKEND.md`

### Diagramas Incluídos

#### 1. Arquitetura Geral
- Visão de alto nível
- Camadas da aplicação
- Componentes principais

#### 2. Fluxo de Autenticação
- Login de usuário
- Validação de token
- Autenticação 2FA

#### 3. Fluxo de Analytics
- Coleta de métricas
- Agregação de analytics
- Consulta de analytics

#### 4. Fluxo de Pagamentos
- Criação de pagamento
- Processamento de webhook
- Fluxo completo

#### 5. Sistema de Background Tasks
- Gerenciamento de tarefas
- Ciclo de vida de uma tarefa
- Processamento em batch

#### 6. Arquitetura de Dados
- Modelo de dados principal
- Cache strategy
- Fluxo de dados - Analytics

#### 7. Ciclo de Requisição Completo
- Do cliente ao banco de dados
- Middlewares e autenticação
- Cache e logging

#### 8. Sistema de Alertas
- Fluxo de alerta
- Hierarquia de severidade
- Auto-resolução

#### 9. Performance e Escalabilidade
- Load balancing
- Caching strategy
- Otimizações

### Formato

- 📊 Diagramas Mermaid (renderizáveis no GitHub)
- 🎨 Código fonte incluído
- 🔄 Diagramas de sequência
- 📈 Diagramas de fluxo
- 🗂️ Diagramas ER

**📖 [Ver Diagramas](./DIAGRAMAS_ARQUITETURA_BACKEND.md)**

---

## 🚀 Guia Rápido

**Arquivo:** `GUIA_RAPIDO_DESENVOLVIMENTO.md`

### Quick Reference

#### 1. Comandos Essenciais
```bash
npm run dev          # Desenvolvimento
npm run build        # Build
npm start           # Produção
docker logs -f      # Logs
```

#### 2. Configuração Rápida
- Variáveis de ambiente
- Iniciar projeto do zero
- Setup completo

#### 3. Como Criar uma Nova API
- Estrutura básica
- Com POST/PUT
- Com Admin Auth

#### 4. Autenticação - Cheat Sheet
- Tipos de auth
- Headers
- Exemplos práticos

#### 5. Analytics - Cheat Sheet
- Coletar métricas
- Usar middleware

#### 6. Pagamentos - Cheat Sheet
- Criar pagamento
- Processar webhook

#### 7. Logging - Cheat Sheet
- Logs básicos
- Logs especializados

#### 8. Utilitários Comuns
- Redis Cache
- Geolocalização
- IP Detection
- Plan Validation

#### 9. Background Tasks
- Agendar tarefa
- Status das tarefas

#### 10. Sistema de Alertas
- Verificar alertas
- Adicionar regra customizada

#### 11. Supabase Queries
- Select, Insert, Update, Delete
- Filtros avançados

#### 12. Tratamento de Erros
- Padrão recomendado
- Erros customizados

#### 13. Testes Rápidos
- Testar endpoints
- Usar Postman

#### 14. Monitoramento
- Health checks
- Ver logs em tempo real

#### 15. Debug
- Ativar debug logs
- Debug de autenticação
- Debug de database

#### 16. Dicas e Boas Práticas
- Try-catch
- Validação de inputs
- Cache
- Logging
- TypeScript

#### 17. Deploy Rápido
- Build e deploy
- Docker Compose

**📖 [Ver Guia Rápido](./GUIA_RAPIDO_DESENVOLVIMENTO.md)**

---

## 🎓 Como Usar Esta Documentação

### Para Desenvolvedores Backend

1. **Começando:**
   - Leia a [Documentação Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md) - Seções 1-5
   - Configure o ambiente seguindo a Seção 5
   - Explore os [Utilitários](./DOCUMENTACAO_BACKEND_COMPLETA.md#utilitários)

2. **Desenvolvendo:**
   - Use o [Guia Rápido](./GUIA_RAPIDO_DESENVOLVIMENTO.md) como referência
   - Consulte [Como Criar uma Nova API](./GUIA_RAPIDO_DESENVOLVIMENTO.md#como-criar-uma-nova-api)
   - Siga as [Dicas e Boas Práticas](./GUIA_RAPIDO_DESENVOLVIMENTO.md#dicas-e-boas-práticas)

3. **Debugando:**
   - Veja [Troubleshooting](./DOCUMENTACAO_BACKEND_COMPLETA.md#troubleshooting)
   - Use a seção [Debug](./GUIA_RAPIDO_DESENVOLVIMENTO.md#debug)

### Para Desenvolvedores Frontend

1. **Integrando APIs:**
   - Consulte [APIs Detalhadas](./DOCUMENTACAO_APIS_DETALHADAS.md)
   - Veja exemplos de Request/Response
   - Entenda autenticação na [Documentação Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#autenticação-e-autorização)

2. **Testando:**
   - Use [Testes Rápidos](./GUIA_RAPIDO_DESENVOLVIMENTO.md#testes-rápidos)
   - Configure Postman com os exemplos

### Para Arquitetos/DevOps

1. **Entendendo a Arquitetura:**
   - Veja [Diagramas de Arquitetura](./DIAGRAMAS_ARQUITETURA_BACKEND.md)
   - Leia [Arquitetura Geral](./DOCUMENTACAO_BACKEND_COMPLETA.md#arquitetura)

2. **Deploy:**
   - Consulte [Deploy e Docker](./DOCUMENTACAO_BACKEND_COMPLETA.md#deploy-e-docker)
   - Use [Deploy Rápido](./GUIA_RAPIDO_DESENVOLVIMENTO.md#deploy-rápido)

3. **Monitoramento:**
   - Configure [Sistema de Alertas](./DOCUMENTACAO_BACKEND_COMPLETA.md#sistema-de-alertas)
   - Monitore com [Monitoramento](./GUIA_RAPIDO_DESENVOLVIMENTO.md#monitoramento)

---

## 📊 Estatísticas da Documentação

| Métrica | Valor |
|---------|-------|
| Total de Páginas | 4 documentos |
| Total de Linhas | ~3800 linhas |
| APIs Documentadas | 200+ endpoints |
| Diagramas | 15+ diagramas |
| Exemplos de Código | 100+ exemplos |
| Utilitários | 20 utilitários |

---

## 🔍 Busca Rápida

### Por Tópico

- **Autenticação:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#autenticação-e-autorização) | [APIs](./DOCUMENTACAO_APIS_DETALHADAS.md#autenticação-auth) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#autenticação-cheat-sheet) | [Diagrama](./DIAGRAMAS_ARQUITETURA_BACKEND.md#fluxo-de-autenticação)

- **Domínios:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#apis-resumo) | [APIs](./DOCUMENTACAO_APIS_DETALHADAS.md#domínios-domains) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#como-criar-uma-nova-api)

- **Analytics:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#sistema-de-analytics) | [APIs](./DOCUMENTACAO_APIS_DETALHADAS.md#analytics) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#analytics-cheat-sheet) | [Diagrama](./DIAGRAMAS_ARQUITETURA_BACKEND.md#fluxo-de-analytics)

- **Pagamentos:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#sistema-de-pagamentos) | [APIs](./DOCUMENTACAO_APIS_DETALHADAS.md#pagamentos-payments) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#pagamentos-cheat-sheet) | [Diagrama](./DIAGRAMAS_ARQUITETURA_BACKEND.md#fluxo-de-pagamentos)

- **Background Tasks:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#tarefas-em-background) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#background-tasks) | [Diagrama](./DIAGRAMAS_ARQUITETURA_BACKEND.md#sistema-de-background-tasks)

- **Logging:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#logging) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#logging-cheat-sheet)

- **Alertas:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#sistema-de-alertas) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#sistema-de-alertas) | [Diagrama](./DIAGRAMAS_ARQUITETURA_BACKEND.md#sistema-de-alertas)

- **Deploy:** [Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md#deploy-e-docker) | [Guia](./GUIA_RAPIDO_DESENVOLVIMENTO.md#deploy-rápido)

### Por Utilitário

| Utilitário | Documentação | Guia Rápido |
|------------|--------------|-------------|
| Logger | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#1-logger-utilsloggerts) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#logging-cheat-sheet) |
| Geolocation | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#2-geolocation-service-utilsgeolocation-servicets) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#geolocalização) |
| Analytics Collector | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#3-analytics-collector-utilsanalytics-collectorts) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#analytics-cheat-sheet) |
| Background Tasks | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#4-background-tasks-utilsbackground-tasksts) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#background-tasks) |
| Alerts Manager | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#5-alerts-manager-utilsalertsts) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#sistema-de-alertas) |
| MercadoPago Client | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#6-payment-clients) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#pagamentos-cheat-sheet) |
| PagBank Client | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#6-payment-clients) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#pagamentos-cheat-sheet) |
| Plan Validation | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#7-plan-validation-utilsplan-validationts) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#plan-validation) |
| Redis Client | [Ver](./DOCUMENTACAO_BACKEND_COMPLETA.md#9-redis-client-utilsredists) | [Ver](./GUIA_RAPIDO_DESENVOLVIMENTO.md#redis-cache) |

---

## 🛠️ Ferramentas e Tecnologias

### Stack Completo

- **Runtime:** Node.js 20.19.0+
- **Framework:** Nuxt 4.1.2
- **Linguagem:** TypeScript 5.7.2
- **Database:** Supabase (PostgreSQL)
- **Cache:** Redis 5.8.1
- **Container:** Docker
- **Proxy:** NGINX

### Bibliotecas Principais

- @supabase/supabase-js
- ioredis
- jose / jsonwebtoken
- bcryptjs
- speakeasy
- qrcode
- node-cron
- zod

---

## 📝 Contribuindo

### Estrutura dos Documentos

```
DOCUMENTACAO_BACKEND_COMPLETA.md  (Principal - Visão geral)
├── DOCUMENTACAO_APIS_DETALHADAS.md  (APIs - Request/Response)
├── DIAGRAMAS_ARQUITETURA_BACKEND.md  (Diagramas visuais)
└── GUIA_RAPIDO_DESENVOLVIMENTO.md   (Cheat Sheet)
```

### Padrões

- ✅ Markdown formatado
- ✅ Exemplos de código com syntax highlighting
- ✅ Diagramas Mermaid
- ✅ Índices navegáveis
- ✅ Referências cruzadas

---

## 📞 Suporte

### Documentação

- 📖 Documentação completa incluída
- 🎓 Guia rápido para referência
- 📊 Diagramas visuais
- 💡 Exemplos práticos

### Recursos Externos

- [Nuxt Documentation](https://nuxt.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redis Documentation](https://redis.io/docs/)

---

## 🎯 Próximos Passos

### Para Iniciar

1. ✅ Leia [Documentação Completa](./DOCUMENTACAO_BACKEND_COMPLETA.md)
2. ✅ Configure o ambiente
3. ✅ Explore os [Diagramas](./DIAGRAMAS_ARQUITETURA_BACKEND.md)
4. ✅ Use o [Guia Rápido](./GUIA_RAPIDO_DESENVOLVIMENTO.md)
5. ✅ Integre com as [APIs](./DOCUMENTACAO_APIS_DETALHADAS.md)

### Para Desenvolvimento

1. Clone o repositório
2. Configure `.env.production`
3. Execute `npm install`
4. Inicie com `npm run dev`
5. Teste com `curl http://localhost:5001/api/health`

---

## 📅 Versionamento

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.2.2 | 25/10/2025 | Documentação completa criada |
| 1.2.1 | 20/10/2025 | Melhorias no sistema de auth |
| 1.2.0 | 15/10/2025 | Sistema de analytics implementado |
| 1.1.0 | 10/10/2025 | Integração com pagamentos |
| 1.0.0 | 01/10/2025 | Release inicial |

---

**Desenvolvido com ❤️ para CDN Proxy**

**Última Atualização:** 25/10/2025  
**Versão do Backend:** 1.2.2  
**Node.js:** 20.19.0+
