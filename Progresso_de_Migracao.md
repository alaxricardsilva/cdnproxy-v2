# Processo de Migração CDN Proxy

## Estado Atual
- Frontend: Nuxt.js v3.x (**totalmente migrado**), integração Supabase em andamento, rotas e compatibilidade sendo validadas.
- Backend: **NestJS** (antes Fastify), módulos dedicados para proxy, logs, geolocalização e autenticação. Estrutura antiga removida e consolidada diretamente em `/backend`.
- Infraestrutura: Docker Compose, Nginx, aaPanel, PM2, Ubuntu Server 22.04.

## Objetivo da Migração
- Migrar frontend para Nuxt.js v3.x (estável). ✅ **Concluído**
- Migrar backend para NestJS, com módulos dedicados para proxy, logs, geolocalização e autenticação. ✅
- Melhorar modularidade, escalabilidade, integração e manutenção. ✅
- Documentar todas as etapas e mudanças realizadas. ✅

## Decisão de Autenticação Supabase
- Utilizar as chaves do Supabase:
  - **Publishable Key**: para inicializar o cliente Supabase no frontend Nuxt.
  - **Secret Key**: para operações administrativas/seguras no backend NestJS.
  - **JWT Signing Keys / Discovery URL**: para validação dos tokens JWT no backend NestJS.
- Fluxo de autenticação:
  1. O frontend Nuxt autentica o usuário via Supabase Auth (Publishable Key).
  2. O frontend envia o JWT do usuário nas requisições para o backend NestJS.
  3. O backend NestJS valida o JWT usando as chaves do Discovery URL do Supabase.
  4. O backend pode usar a Secret Key para operações administrativas, se necessário.

## Como configurar o Discovery URL e Secret Key no backend NestJS
1. Crie um arquivo `.env` na pasta `/backend` com as variáveis:
   ```env
   SUPABASE_DISCOVERY_URL=https://<project-id>.supabase.co/auth/v1/.well-known/jwks.json
   SUPABASE_SECRET_KEY=<sua-secret-key>
   ```
2. No código do backend, utilize essas variáveis para validar JWT e realizar operações administrativas.
3. Certifique-se de que o Dockerfile e o Docker Compose estejam configurados para carregar o arquivo `.env`.

---

## Etapas
1. Preparação e documentação do estado atual. ✅
2. Migração do frontend para Nuxt 3. ✅
   - **Todas as páginas migradas para Nuxt 3 e Composition API:**
     - Área admin: domínios, pagamentos, perfil, PIX
     - Área superadmin: dashboard, domínios (index, create, edit), planos (index, create, edit), usuários (index, create, edit), perfil, analytics, transações, configuração de pagamento
     - Layouts e componentes compartilhados (LogoutButton)
     - Página do carrinho
   - **Removido Options API, useFetch e axios**
   - **Utilizado `<script setup>`, `ref`, `$fetch` em todas as páginas**
   - **Layouts migrados para sintaxe Nuxt 3**
3. Criação do backend com NestJS. ✅
   - Estrutura inicial criada: módulos de proxy, logs, geolocalização
   - Controllers e services básicos implementados
   - Correção de erros de decorators e tipagem
   - **Remoção completa do backend antigo (Fastify/TypeScript puro)**
   - Backend NestJS agora está diretamente em `/backend`
4. Implementação de middlewares essenciais (autenticação, logging, CORS). ✅
   - Middleware JWT implementado e aplicado globalmente (exceto `/status`)
   - Middleware de logging e roteamento presentes
   - CORS configurado
5. Atualização da infraestrutura Docker/Nginx. ✅
   - Docker Compose atualizado para usar apenas o backend NestJS
   - Dockerfile atualizado para carregar o `.env`
6. Testes e validação das rotas principais do backend. ✅
   - Testes e2e implementados para rotas públicas e protegidas
   - Registro de logs e analytics integrado nos controllers principais (streaming, geolocalização, status)
   - Consulta de logs disponível via rota `/logs`
7. Integração backend/frontend e Supabase. ⏳
   - Validar comunicação entre frontend Nuxt 3 e backend NestJS
   - Testar envio e validação do JWT
8. Finalização e monitoramento. ⏳
   - Monitorar funcionamento pós-migração
   - Corrigir eventuais problemas

## Histórico de Mudanças
- [x] Documentar estado atual do projeto.
- [x] Migrar frontend para Nuxt 3 (**todas páginas, layouts e componentes migrados**)
- [x] Migrar backend para NestJS (estrutura inicial, controllers/services, correções).
- [x] Integrar registro de logs e analytics nos controllers principais.
- [x] Implementar middleware JWT do Supabase no backend NestJS (guard global, exceção para `/status`).
- [x] Remover backend antigo e consolidar estrutura no NestJS.
- [x] Atualizar Docker Compose para refletir novo backend.
- [x] Testes e2e básicos implementados.
- [ ] Testar e validar integração frontend/backend/Supabase.
- [ ] Remover referências antigas à SUPABASE_KEY.
- [ ] Atualizar documentação com exemplos de uso das rotas e testes.
- [ ] Monitoramento pós-migração.

---

## Backend NestJS - Progresso
- Estrutura inicial dos módulos criada
- Controllers e services básicos implementados
- Correção de decorators/tipagem
- Registro de logs e analytics integrado nos controllers principais
- Decisão: autenticação baseada em JWT do Supabase
- Middleware JWT implementado e aplicado globalmente (exceto `/status`)
- **Backend antigo removido, estrutura consolidada diretamente em `/backend`**
- Testes e2e implementados para rotas públicas e protegidas
- Docker Compose e Dockerfile atualizados
- Próximo: Testar rotas protegidas, validar integração frontend/backend, remover referências antigas à SUPABASE_KEY, atualizar documentação

## Frontend Nuxt 3 - Progresso
- Dependências atualizadas para Nuxt 3
- **Todas as páginas, layouts e componentes migrados para sintaxe Nuxt 3 e Composition API**
- Integração com Supabase em andamento
- Rotas e middlewares sendo validados

## Infraestrutura
- Docker Compose atualizado para incluir backend NestJS
- Integração com Nginx validada

---

*Este documento foi atualizado para refletir a migração completa do frontend para Nuxt 3, incluindo todas as páginas, layouts e componentes, além do progresso da integração com Supabase e os próximos passos para validação e monitoramento.*


Perfeito! Seguindo essa arquitetura, seu projeto ficará moderno, seguro, escalável e fácil de manter. Aqui está o plano prático para avançar com cada etapa, começando pelo frontend Nuxt 3 + Vuetify 3 e integração com backend NestJS.

## Próximos Passos Detalhados

### 1. Migrar configuração de Vite para nuxt.config.js

- Adicionar em /www/wwwroot/CDNProxy_v2/frontend/nuxt.config.js :
  ```
  export default defineNuxtConfig({
    vite: {
      server: {
        allowedHosts: ['app.
        cdnproxy.top', 'localhost']
      }
    }
    // ...outras configs
  })
  ```
- Remover configurações duplicadas do vite.config.js .

### 2. Validar variáveis de ambiente e reiniciar serviços

- No frontend, garantir que .env usa prefixo NUXT_PUBLIC_ para variáveis acessíveis no client.
- No backend, .env para segredos e configs privadas.
- Reiniciar Nuxt e NestJS após qualquer alteração.

### 3. Implementar autenticação e roles no backend NestJS

- Usar JWT para autenticação.
- Criar guards para roles ( SUPERADMIN , ADMIN ).
- Implementar 2FA (TOTP) para admins.
- Integrar com Supabase/PostgreSQL.

### 4. Integrar frontend com backend via API REST

- Usar composables ou services no Nuxt para consumir endpoints do NestJS.
- Garantir que tokens JWT e headers de autenticação sejam enviados corretamente.

### 5. Configurar Nginx para proxy reverso e SSL

- Usar arquivos de configuração em /www/wwwroot/CDNProxy_v2/Ngnix/ .
- Redirecionar HTTP para HTTPS.
- Roteamento correto para frontend ( app.cdnproxy.top ) e backend ( api.cdnproxy.top ).

### 6. Testar fluxo completo de SUPERADMIN e ADMIN

- Validar dashboards, permissões, CRUD de domínios/usuários, ativação de 2FA.
- Testar integração com streaming/CDN.

## Ferramentas e Stack

- Frontend: Nuxt 3 + Vuetify 3 (dashboard moderno, dark mode, sidebar, cards)
- Backend: NestJS + Supabase/PostgreSQL + JWT + 2FA
- Infra: Nginx + Docker + Cloudflare

## Checklist de Correção de Erros

- Variáveis de ambiente corretas (.env)
- allowedHosts configurado no nuxt.config.js
- Backend e frontend em portas separadas
- CORS e proxy reverso funcionando
- Testes de integração frontend-backend


---

## Plano de Migração Backend NestJS: TypeORM → Prisma

### Objetivo
Migrar o backend NestJS do TypeORM para Prisma, garantindo compatibilidade total com NeonDB, suporte a RLS (Row Level Security), maior segurança, tipagem forte e facilidade de manutenção.

### Etapas do Processo
1. **Preparação**
   - Listar todos os módulos, entidades e serviços que utilizam TypeORM.
   - Validar as tabelas existentes no banco NeonDB.
   - Configurar o Prisma no projeto (`npx prisma init`).
   - Garantir que o `.env` contém a `DATABASE_URL` correta.

2. **Geração do Schema Prisma**
   - Executar `npx prisma db pull` para introspectar o banco e gerar os modelos no `schema.prisma`.
   - Adicionar o bloco `generator client` ao `schema.prisma`.
   - Executar `npx prisma generate` para criar o Prisma Client.

3. **Migração Gradual dos Módulos**
   - Migrar um módulo de exemplo (ex: Users) para Prisma:
     - Refatorar o service para usar o Prisma Client.
     - Ajustar o controller para usar o novo service.
     - Atualizar os testes para refletir o uso do Prisma.
   - Validar funcionamento e performance.
   - Migrar gradualmente os demais módulos: Payments, Plans, Domains, Profiles, Configurations, PixTransactions, DashboardData, GeneralConfig, AccessLogs, GeolocationCache, MonthlyTraffic, TrafficMetrics.

4. **Remoção do TypeORM**
   - Remover dependências do TypeORM do projeto (`package.json`).
   - Remover configurações e imports do TypeORM dos módulos.
   - Atualizar Dockerfile e Docker Compose se necessário.

5. **Validação e Testes**
   - Executar testes automatizados e2e e unitários.
   - Validar integração frontend/backend.
   - Garantir que todas as rotas e operações estão funcionando com Prisma.

6. **Documentação e Exemplos**
   - Atualizar a documentação do backend para refletir o uso do Prisma.
   - Adicionar exemplos de queries, mutations e uso do Prisma Client.

### Observações Importantes
- O Prisma oferece suporte nativo ao NeonDB e RLS.
- O processo pode ser realizado de forma incremental, migrando módulo por módulo.
- Recomenda-se validar cada etapa em ambiente de desenvolvimento antes de aplicar em produção.
- O schema gerado pelo Prisma pode ser ajustado manualmente para refletir regras de negócio e constraints específicas.

### Referências
- [Documentação Prisma](https://www.prisma.io/docs)
- [Documentação NeonDB](https://neon.tech/docs)
- [NestJS + Prisma](https://docs.nestjs.com/recipes/prisma)

---