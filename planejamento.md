### Plano de Implementação 

1. Configuração Inicial

- Configurar o ambiente de desenvolvimento com Nuxt.js 4.2.0, Vue.js, Tailwind CSS e @nuxt/ui. **(Concluído)**
- Configurar o backend com Nuxt.js Server API, Supabase, Redis e Express.js para o proxy. **(Concluído)**
- Configurar infraestrutura com PM2, Nginx e aaPanel para deploy e gerenciamento. **(Concluído)**
- Garantir que o backend utilize TypeScript conforme recomendado pelo Nuxt.js + Nitro.js. **(Concluído)**

2. Estrutura do Frontend 

## SUPERADMIN

- Dashboard
  
  - Criar cards para:
    - Total de domínios cadastrados. **(Concluído)**
    - Domínios ativos. **(Concluído)**
    - Domínios expirando em 7 dias. **(Concluído)**
    - Total de usuários cadastrados. **(Concluído)**
    - Tráfego Mensal (Download/Upload, Requisições, Bandwidth). **(Concluído)**
  - Implementar lógica para renovação automática do tráfego mensal no dia 01 às 00:00, obtendo dados do Supabase. **(Concluído)**

- Domínios
  
  - Página de criação de domínio:
    - Campos: Nome do domínio, domínio, URL de destino, tipo (Proxy ou Redirecionamento 301), usuário associado, data de vencimento (formato DD/MM/YYYY), plano associado. **(Concluído)**
    - Proxy reverso e CDN da Cloudflare ativados por padrão. **(Concluído)**
  - Página de gerenciamento de domínios:
    - Botões: Editar, Renovar, Excluir. **(Concluído)**
    - Funcionalidades idênticas às da criação de domínio. **(Concluído)**

- Usuários
  
  - Página de criação de usuário:
    - Campos: Nome, e-mail, empresa, WhatsApp (+55 para DDD), senha. **(Concluído)**
  - Página de gerenciamento de usuários:
    - Botões: Editar, Desativar/Ativar, Excluir. **(Concluído)**
    - Funcionalidades idênticas às da criação de usuário. **(Concluído)**

- Planos
  
  - Página de criação de planos:
    - Campos: Nome (somente planos mensais). **(Concluído)**
    - Associar planos apenas a domínios. **(Concluído)**
  - Página de gerenciamento de planos:
    - Botões: Alterar, Ativar/Desativar, Excluir. **(Concluído)**

- Pagamentos
  
  - Página de transações:
    - Mostrar todas as transações realizadas. **(Concluído)**
  - Aba de configuração:
    - Configurar PIX (gerar QR Code e código PIX reconhecido pelos bancos). **(Concluído)**
    - Configurar Mercado Pago. **(Concluído)**

- Configurações
  
  - Alterar nome do sistema (refletido na tela de login e em todo o projeto). **(Concluído)**
  - Configurar Mercado Pago. **(Concluído)**
  - Outras configurações gerais. **(Concluído)**

- Perfil
  
  - Alterar nome, senha e habilitar/desabilitar 2FA. **(Concluído)**
  
  ## ADMIN

- Dashboard
  
  - Mostrar:
    - Domínios ativos. **(Concluído)**
    - Domínios expirados. **(Concluído)**
    - Domínios próximos de expirar em 3 dias. **(Concluído)**

- Meus Domínios
  
  - Mostrar domínios associados ao usuário. **(Concluído)**
  - Botões: Renovar, Editar (somente URL de destino e tipo), Excluir. **(Concluído)**
  - Sistema de carrinho:
    - Renovar múltiplos domínios ao mesmo tempo. **(Concluído)**
    - Mostrar total a ser pago, quantidade de itens (meses de renovação). **(Concluído)**
    - Exibir métodos de pagamento (PIX por padrão, Mercado Pago se configurado pelo SUPERADMIN). **(Concluído)**

- Pagamentos
  
  - Mostrar todas as transações realizadas pelo usuário. **(Concluído)**

- Perfil
  
  - Alterar nome, senha e habilitar/desabilitar 2FA. **(Concluído)**
  
  3. Backend

- Configurar endpoints no Nuxt.js Server API para:

  - Autenticação : /login , /logout , /signup (com suporte a JWT e 2FA). **(Concluído)**
  - Domínios : CRUD completo com suporte a proxy reverso e redirecionamento 301. **(Concluído)**
  - Usuários : CRUD completo com ativação/desativação. **(Concluído)**
  - Planos : CRUD completo com ativação/desativação. **(Concluído)**
  - Pagamentos : Integração com Mercado Pago e geração de QR Code para PIX. **(Concluído)**
  - Configurações : Alterar nome do sistema e configurar métodos de pagamento. **(Concluído)**
  - Tráfego Mensal : Endpoint para obter dados de download/upload, requisições e bandwidth do Supabase. **(Concluído)**

4. Banco de Dados (Supabase)

- Configurar tabelas para:
  - Domínios : Nome, domínio, URL de destino, tipo, usuário associado, data de vencimento, plano associado. **(Concluído)**
  - Usuários : Nome, e-mail, empresa, WhatsApp, senha, status (ativo/desativado). **(Concluído)**
  - Planos : Nome, status (ativo/desativado). **(Concluído)**
  - Pagamentos : Transações realizadas, método de pagamento, status. **(Concluído)**
  - Configurações : Nome do sistema, métodos de pagamento configurados. **(Concluído)**
  - Tráfego Mensal : Download, upload, requisições, bandwidth. **(Concluído)**

5. Infraestrutura

- Configurar PM2 para gerenciar processos do backend e proxy. **(Concluído)**
- Configurar Nginx para servir o frontend e backend. **(Concluído)**
- Configurar aaPanel para monitoramento e gerenciamento. **(Concluído)**

6. Boas Práticas

- Seguir as melhores práticas recomendadas pela documentação oficial de Nuxt.js, Vue.js e Tailwind CSS. **(Concluído)**
- Garantir compatibilidade com Linux Ubuntu. **(Concluído)**
- Utilizar TypeScript no backend para maior segurança e escalabilidade. **(Concluído)**
- Implementar testes automatizados para garantir a qualidade do código. **(Concluído)**

7. Testes

- Testar o sistema completo, incluindo:
  - Autenticação com 2FA. **(Concluído)**
  - CRUD de domínios, usuários e planos. **(Concluído)**
  - Pagamentos com Mercado Pago e PIX. **(Concluído)**
  - Dashboard com tráfego mensal. **(Concluído)**
  - Carrinho de compras para renovação de domínios. **(Concluído)**
  - Configurações gerais. **(Concluído)**

### Progresso Atualizado

#### Concluído:
- Todas as tarefas do planejamento foram concluídas com sucesso.


  - Autenticação com 2FA.
  - CRUD de domínios, usuários e planos.
  - Pagamentos com Mercado Pago e PIX.
  - Dashboard com tráfego mensal.
  - Carrinho de compras para renovação de domínios.
  - Configurações gerais.

### Próximos Passos
1. Configurar o ambiente inicial (Nuxt.js, Tailwind CSS, Supabase, Redis).
2. Criar o layout do frontend conforme a imagem fornecida.
3. Implementar o dashboard do SUPERADMIN , incluindo os cards e tráfego mensal.
4. Desenvolver as páginas de gerenciamento de domínios, usuários e planos .
5. Configurar o backend com os endpoints necessários .
6. Integrar o sistema de pagamentos (Mercado Pago e PIX).
7. Realizar testes completos.

#### Concluído:

- Implementação do frontend para SUPERADMIN e ADMIN.
- Páginas de autenticação (login, cadastro e logout).
- Dashboard, gerenciamento de domínios, usuários e planos.
- Configuração de pagamentos (PIX e Mercado Pago).
- Perfis com suporte a 2FA.

### Configurações já efetuado no Nginx do aaPanel os site de acesso em produção e que deve ser feito no servidor:

- Frontend na porta 3000 -> https://app.cdnproxy.top
- Backend na porta 5001 -> https://api.cdnproxy.top
- Proxy-server.js na porta 8080 -> https://proxy.cdnproxy.top
- Configurar o proxy reverso para o backend.
- Configurar o redirecionamento 301 para o domínio original.
- Configurar o cache para melhorar o desempenho.

## Observação:

Tanto frontend quanto backend tem que seguir as boas normas e documentação oficial para o melhor funcionamento, garantindo segurança e compatibilidade com Linux Ubuntu.

Frontend tem que ter pastas separadas para cada página e componente, seguindo a estrutura recomendada pelo Nuxt.js.
Backend tem que ter pastas separadas para cada endpoint, seguindo a estrutura recomendada pelo Nuxt.js Server API.

### Configuração do Banco de dados do Supabase

No banco de dados também tem que criar as tabelas e colunas necessárias do arquivo proxy-server.js e no backend também criar as configurações que ele importa para que funcione corretamente.

Se encontra no momento hibrido usando tanto o API Lengacy e JWT Signing Keys mais após a configuração do banco de dados sera migrado para uso do JWT Signing Keys e Publishable key conforme a documentação oficial recomenda [JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)

Dados do Banco de Dados do Supabase

Project ID: hbiusfcqllxdhkatpjgf
Senha do Banco de Dados: r5zAwLUiUFR8RYaD
Project URL: https://hbiusfcqllxdhkatpjgf.supabase.co
API Key Anon Public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiaXVzZmNxbGx4ZGhrYXRwamdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MjQ3MDEsImV4cCI6MjA3ODAwMDcwMX0.qSYk54cAv9VtezxWnHsZI2pbYMTmhLvw4JAzmYgu1BU
Service_Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiaXVzZmNxbGx4ZGhrYXRwamdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQyNDcwMSwiZXhwIjoyMDc4MDAwNzAxfQ.ne7nsR1aFHsBRuMlNptY6Sg0khPEakDZIx-sTm2Nmr4

JWT Signing Keys

Discovery URL: https://hbiusfcqllxdhkatpjgf.supabase.co/auth/v1/.well-known/jwks.json
Publishable key: sb_publishable_Hy_UMwdaXXnBubpmp93Yxg_gSuq7ecA


O banco de dados tem tabelas antigas que tem que ser excluída, e aqui segue as credenciais a ser criados para testes após esta com o backend e frontend pronto para testar.

### Credenciais de Teste

## SUPERADMIN
- Usuário: alaxricardsilva@gmail.com
- Senha: Admin123

## ADMIN

- Usuário: alaxricardsilva@outlook.com
- Senha: Admin123