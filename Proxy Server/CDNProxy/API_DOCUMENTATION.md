# Documentação das APIs do CDNProxy

## Versão do Nuxt.js
- **Versão utilizada**: 4.1.2

## Visão Geral
O backend do CDNProxy é construído com Nuxt.js 4 como uma aplicação API-only, sem interface frontend. Todas as rotas são configuradas para retornar JSON, e o sistema utiliza autenticação híbrida com Supabase Auth e JWT personalizado.

## Estrutura das APIs

### Endpoints Públicos
1. **Health Check**
   - `GET /api/health`
   - Retorna informações sobre o estado do sistema

2. **Métricas**
   - `GET /api/metrics`
   - Retorna métricas de desempenho do sistema

### Endpoints Protegidos - Admin
1. **Dashboard**
   - `GET /api/admin/dashboard`
   - Requer role ADMIN ou SUPERADMIN

2. **Perfil**
   - `GET /api/admin/profile`
   - Retorna informações do perfil do admin

3. **Domínios**
   - `GET /api/admin/domains`
   - `POST /api/admin/domains`
   - `PUT /api/admin/domains/{id}`
   - `DELETE /api/admin/domains/{id}`
   - Gerenciamento de domínios

### Endpoints Protegidos - Superadmin
1. **Dashboard**
   - `GET /api/superadmin/dashboard`
   - Requer role SUPERADMIN

2. **Usuários**
   - `GET /api/superadmin/users`
   - `POST /api/superadmin/users`
   - `PUT /api/superadmin/users/{id}`
   - `DELETE /api/superadmin/users/{id}`
   - Gerenciamento completo de usuários

3. **Configurações**
   - `GET /api/superadmin/settings`
   - `PUT /api/superadmin/settings`
   - Configurações globais do sistema

## Autenticação

### Método de Autenticação
O sistema utiliza uma autenticação híbrida que combina:
- **Supabase Auth**: Para autenticação via tokens do Supabase
- **JWT Personalizado**: Para fallback e autenticação local

### Headers de Autenticação
```
Authorization: Bearer <token>
```

### Respostas de Erro de Autenticação
Quando um endpoint protegido é acessado sem token válido:
```json
{
  "error": true,
  "statusCode": 401,
  "statusMessage": "Token de autenticação necessário",
  "message": "Token de autenticação necessário"
}
```

## Problemas Comuns e Soluções

### 1. APIs Retornando HTML em vez de JSON

#### Problema
Endpoints de API retornando a página "Welcome do Nuxt.js" em vez de respostas JSON.

#### Causa
- Configuração incorreta do modo API-only no Nuxt.js
- Ausência de regras de roteamento apropriadas
- Fallback acidental para conteúdo frontend

#### Soluções
1. **Configurar Nuxt.js como API-only**:
   ```typescript
   export default defineNuxtConfig({
     ssr: false,
     pages: false, // Desativar completamente o modo de página
     nitro: {
       routeRules: {
         '/api/**': { 
           cors: true,
           ssr: false,
           prerender: false,
           index: false
         }
       }
     }
   })
   ```

2. **Implementar tratamento de erros adequado**:
   ```typescript
   export default <NitroErrorHandler>function (error, event) {
     // Para rotas de API, sempre retornar JSON
     if (event.node.req.url?.startsWith('/api/')) {
       event.node.res.statusCode = error.statusCode || 500
       event.node.res.setHeader('Content-Type', 'application/json')
       
       const response = JSON.stringify({
         error: true,
         statusCode: error.statusCode || 500,
         statusMessage: error.statusMessage || 'Internal Server Error',
         message: error.message || 'An error occurred'
       })
       
       event.node.res.end(response)
       return
     }
   }
   ```

3. **Verificar middleware de CORS**:
   ```typescript
   export default defineEventHandler(async (event) => {
     // Configurar headers CORS para todas as requisições
     setHeaders(event, {
       'Access-Control-Allow-Origin': '*',
       'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
       'Content-Type': 'application/json'
     })
   })
   ```

### 2. Problemas de CORS

#### Problema
Requisições bloqueadas devido a políticas CORS inadequadas.

#### Solução
Configurar headers CORS explicitamente em todos os endpoints:
```typescript
setHeaders(event, {
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true'
})
```

### 3. Problemas de Deploy

#### Problema
Containers não iniciam ou apresentam erros após deploy.

#### Soluções
1. **Rebuild completo**:
   ```bash
   # Parar e remover containers
   docker-compose -f docker-compose.server2.yml down --volumes --remove-orphans
   
   # Remover imagens antigas
   docker rmi cdnproxy-backend cdnproxy-redis
   
   # Limpar cache do Docker
   docker builder prune -f
   
   # Reconstruir do zero
   docker-compose -f docker-compose.server2.yml build --no-cache
   docker-compose -f docker-compose.server2.yml up -d
   ```

2. **Verificar variáveis de ambiente**:
   Certificar-se de que todas as variáveis necessárias estão definidas no `.env.production`.

## Conformidade com Documentação Oficial do Nuxt.js

### Modo API-only
De acordo com a documentação oficial do Nuxt.js, para criar uma API pura:
1. Definir `pages: false` no nuxt.config.ts
2. Criar endpoints em `server/api/`
3. Não incluir arquivos de página (app.vue, pages/)

### Tratamento de Erros
Seguindo as melhores práticas da documentação:
1. Usar `createError` para erros HTTP
2. Implementar errorHandler personalizado para Nitro
3. Retornar sempre JSON para endpoints de API

### Segurança
Práticas recomendadas:
1. Configurar headers de segurança apropriados
2. Implementar CORS corretamente
3. Validar tokens de autenticação em middlewares
4. Usar HTTPS em produção

## Testes

### Teste de Health Check
```bash
curl -s https://api.cdnproxy.top/api/health | jq .
```

### Teste de Autenticação
```bash
# Sem token (deve retornar erro 401)
curl -s https://api.cdnproxy.top/api/admin/dashboard | jq .

# Com token válido
curl -s -H "Authorization: Bearer <token>" https://api.cdnproxy.top/api/admin/dashboard | jq .
```

## Monitoramento

### Logs
Os logs são registrados com o formato:
```json
{
  "timestamp": "ISO_TIMESTAMP",
  "level": "info|warn|error",
  "service": "ProxyCDN-Backend",
  "message": "Mensagem do log",
  "metadata": { }
}
```

### Métricas
O endpoint `/api/metrics` fornece informações sobre:
- Uso de memória
- Tempo de resposta
- Status dos serviços
- Contadores de requisições