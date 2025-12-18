# 🔧 Correção do Backend - Sistema de Tracking de Episódios

## 📋 Resumo do Problema

O sistema de tracking de episódios está funcionando corretamente no proxy, mas o **backend remoto** (`https://api.cdnproxy.top`) está retornando **HTML em vez de JSON**, causando erros de parsing:

```
❌ [ANALYTICS] Erro ao parsear resposta: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 🎯 Endpoints que Precisam ser Criados/Corrigidos

### 1. `/api/analytics/collect-episode-metrics` (POST)
**Problema**: Endpoint não existe ou retorna HTML
**Solução**: Criar endpoint que aceite dados de episódio

### 2. `/api/analytics/collect-session-change` (POST)
**Problema**: Endpoint não existe ou retorna HTML
**Solução**: Criar endpoint que aceite dados de mudança de sessão

## 🗄️ Correções Necessárias no Banco Supabase

### 📄 **ARQUIVO SQL COMPLETO DISPONÍVEL**
**Execute o arquivo**: `supabase-episode-tracking-schema.sql`

Este arquivo contém:
- ✅ Todos os comandos SQL necessários
- ✅ Índices para melhorar performance  
- ✅ Triggers para auto-update
- ✅ Views para relatórios
- ✅ Consultas de verificação

### Campos Ausentes Identificados:

#### Tabela `access_logs` - 6 campos ausentes:
- `episode_id` (TEXT) - ID único do episódio
- `session_id` (TEXT) - ID da sessão de streaming
- `change_type` (TEXT) - Tipo de mudança detectada
- `content_id` (TEXT) - ID do conteúdo/série
- `bytes_sent` (INTEGER) - Bytes enviados na resposta
- `response_time_ms` (INTEGER) - Tempo de resposta em ms

#### Tabela `domain_analytics` - 13 campos ausentes:
- `country` (TEXT) - País baseado no IP
- `episode_id` (TEXT) - ID único do episódio
- `session_id` (TEXT) - ID da sessão de streaming
- `change_type` (TEXT) - Tipo de mudança detectada
- `content_id` (TEXT) - ID do conteúdo/série
- `client_ip` (TEXT) - Endereço IP do cliente
- `device_type` (TEXT) - Tipo de dispositivo
- `user_agent` (TEXT) - User Agent do navegador
- `bytes_transferred` (INTEGER) - Total de bytes transferidos
- `duration_seconds` (INTEGER) - Duração da sessão
- `status_code` (INTEGER) - Código de status HTTP
- `created_at` (TIMESTAMP) - Data de criação
- `updated_at` (TIMESTAMP) - Data de atualização

#### Tabela `streaming_metrics` - 14 campos (NOVA TABELA):
- `id` (UUID) - ID único do registro
- `domain` (TEXT) - Domínio do proxy
- `domain_id` (UUID) - Referência ao domínio
- `session_id` (TEXT) - ID da sessão
- `episode_id` (TEXT) - ID do episódio
- `change_type` (TEXT) - Tipo de mudança
- `content_id` (TEXT) - ID do conteúdo
- `client_ip` (TEXT) - IP do cliente
- `device_type` (TEXT) - Tipo de dispositivo
- `country` (TEXT) - País do usuário
- `user_agent` (TEXT) - User Agent
- `bytes_transferred` (INTEGER) - Bytes transferidos
- `duration_seconds` (INTEGER) - Duração em segundos
- `quality` (TEXT) - Qualidade do stream
- `bandwidth_mbps` (DECIMAL) - Largura de banda
- `created_at` (TIMESTAMP) - Data de criação
- `updated_at` (TIMESTAMP) - Data de atualização

## 🐳 Implementação no Backend Docker

### Estrutura de Arquivos Necessária:

```
backend/
├── server/
│   └── api/
│       └── analytics/
│           ├── collect-episode-metrics.post.ts
│           └── collect-session-change.post.ts
└── utils/
    └── episode-analytics.ts
```

### 1. Criar `server/api/analytics/collect-episode-metrics.post.ts`

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Ler dados do corpo da requisição
    const episodeData = await readBody(event)
    
    logger.info('📺 [EPISODE-METRICS] Recebendo dados:', {
      domain: episodeData.domain,
      episode_id: episodeData.episode_id,
      session_id: episodeData.session_id,
      change_type: episodeData.change_type
    })

    // Validar dados obrigatórios
    if (!episodeData.domain || !episodeData.episode_id || !episodeData.session_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados obrigatórios ausentes: domain, episode_id, session_id'
      })
    }

    // Configurar Supabase
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Inserir dados na tabela streaming_metrics
    const { data, error } = await supabase
      .from('streaming_metrics')
      .insert({
        domain: episodeData.domain,
        domain_id: episodeData.domain_id,
        session_id: episodeData.session_id,
        episode_id: episodeData.episode_id,
        change_type: episodeData.change_type,
        content_id: episodeData.content_id,
        client_ip: episodeData.client_ip,
        device_type: episodeData.device_type,
        country: episodeData.country,
        bytes_transferred: episodeData.bytes_transferred || 0,
        duration_seconds: episodeData.duration_seconds || 0
      })

    if (error) {
      logger.error('❌ [EPISODE-METRICS] Erro ao inserir no Supabase:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao salvar métricas de episódio'
      })
    }

    logger.info('✅ [EPISODE-METRICS] Dados salvos com sucesso')

    return {
      success: true,
      message: 'Métricas de episódio coletadas com sucesso',
      data: data
    }

  } catch (error) {
    logger.error('❌ [EPISODE-METRICS] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})
```

### 2. Criar `server/api/analytics/collect-session-change.post.ts`

```typescript
import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Ler dados do corpo da requisição
    const sessionData = await readBody(event)
    
    logger.info('🔄 [SESSION-CHANGE] Recebendo dados:', {
      session_id: sessionData.session_id,
      previous_session: sessionData.previous_session_id,
      change_reason: sessionData.change_reason,
      client_ip: sessionData.client_ip
    })

    // Validar dados obrigatórios
    if (!sessionData.session_id || !sessionData.client_ip) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Dados obrigatórios ausentes: session_id, client_ip'
      })
    }

    // Configurar Supabase
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.supabaseUrl!,
      config.supabaseServiceKey!
    )

    // Inserir dados na tabela access_logs com informações de sessão
    const { data, error } = await supabase
      .from('access_logs')
      .insert({
        domain: sessionData.domain || 'session-change',
        domain_id: sessionData.domain_id,
        path: '/session-change',
        method: 'SESSION',
        status_code: 200,
        client_ip: sessionData.client_ip,
        user_agent: sessionData.user_agent || 'Session Change',
        device_type: sessionData.device_type,
        country: sessionData.country,
        session_id: sessionData.session_id,
        change_type: 'session_change',
        content_id: sessionData.previous_session_id
      })

    if (error) {
      logger.error('❌ [SESSION-CHANGE] Erro ao inserir no Supabase:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao salvar mudança de sessão'
      })
    }

    logger.info('✅ [SESSION-CHANGE] Dados salvos com sucesso')

    return {
      success: true,
      message: 'Mudança de sessão registrada com sucesso',
      data: data
    }

  } catch (error) {
    logger.error('❌ [SESSION-CHANGE] Erro:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno do servidor'
    })
  }
})
```

### 3. Atualizar `server/api/analytics/collect.post.ts` (se existir)

Adicionar suporte aos novos campos de episódio:

```typescript
// Adicionar ao final da função de inserção no access_logs:
const accessLogData = {
  // ... campos existentes ...
  episode_id: logData.episode_id || null,
  session_id: logData.session_id || null,
  change_type: logData.change_type || null,
  content_id: logData.content_id || null,
  bytes_sent: logData.bytes_sent || 0,
  response_time_ms: logData.response_time_ms || 0
}
```

## 🔧 Passos para Implementação

### 1. **🗄️ Executar SQL no Supabase** (CRÍTICO - PRIMEIRO PASSO)
```bash
# 1. Acesse: https://supabase.com/dashboard
# 2. Selecione seu projeto
# 3. Vá para "SQL Editor"
# 4. Abra o arquivo: supabase-episode-tracking-schema.sql
# 5. Cole todo o conteúdo no editor
# 6. Clique em "Run" para executar
# 7. Verifique se não há erros na execução
```

**⚠️ IMPORTANTE**: Execute o SQL ANTES de atualizar o backend!

### 2. **🐳 Atualizar Backend Docker**
```bash
# No servidor do backend (https://api.cdnproxy.top)
cd /caminho/para/backend

# Parar containers
docker-compose down

# Criar os arquivos TypeScript listados na documentação:
# - server/api/analytics/collect-episode-metrics.post.ts
# - server/api/analytics/collect-session-change.post.ts

# Reconstruir e iniciar
docker-compose up -d --build

# Verificar logs
docker-compose logs -f
```

### 3. **⚙️ Verificar Configurações do Runtime**
Garantir que `nuxt.config.ts` tenha:
```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // ... outras configs
  }
})
```

### 4. **🔐 Verificar Variáveis de Ambiente**
```bash
# No container do backend, verificar se existem:
SUPABASE_URL=https://jyconxalcfqvqakrswnb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Comando para verificar:
docker exec -it <container_name> env | grep SUPABASE
```

### 5. **🔍 Verificar Endpoints Criados**
```bash
# Testar se os endpoints respondem corretamente:
curl -I https://api.cdnproxy.top/api/analytics/collect-episode-metrics
curl -I https://api.cdnproxy.top/api/analytics/collect-session-change

# Deve retornar: 405 Method Not Allowed (para GET)
# Não deve retornar: 404 Not Found
```

## 🧪 Teste das Correções

### 1. **🔍 Verificar SQL no Supabase**
```sql
-- No SQL Editor do Supabase, execute para verificar:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'streaming_metrics';

-- Deve retornar 16 colunas se a tabela foi criada corretamente
```

### 2. **🚀 Script de Teste Automático**
```bash
# No servidor proxy, execute:
node test-episode-tracking.js

# Resultado esperado:
# ✅ [ANALYTICS] Log de acesso enviado com sucesso
# ✅ [ANALYTICS] Métricas de episódio enviadas com sucesso  
# ✅ [ANALYTICS] Mudança de sessão registrada com sucesso
```

### 3. **🔧 Teste Manual dos Endpoints**
```bash
# Testar endpoint de episódios
curl -X POST https://api.cdnproxy.top/api/analytics/collect-episode-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "test.cdnproxy.top",
    "episode_id": "test-episode-001",
    "session_id": "test-session-123",
    "change_type": "new_episode",
    "content_id": "serie-teste",
    "client_ip": "127.0.0.1",
    "device_type": "desktop",
    "country": "BR"
  }'

# Resposta esperada:
# {"success":true,"message":"Métricas de episódio coletadas com sucesso"}

# Testar endpoint de sessões
curl -X POST https://api.cdnproxy.top/api/analytics/collect-session-change \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-456",
    "client_ip": "127.0.0.1",
    "previous_session_id": "test-session-123",
    "change_reason": "new_episode",
    "domain": "test.cdnproxy.top"
  }'

# Resposta esperada:
# {"success":true,"message":"Mudança de sessão registrada com sucesso"}
```

### 4. **📊 Verificar Dados no Supabase**
```sql
-- Verificar se os dados estão sendo inseridos:
SELECT COUNT(*) FROM streaming_metrics WHERE created_at > NOW() - INTERVAL '1 hour';
SELECT COUNT(*) FROM access_logs WHERE episode_id IS NOT NULL;
SELECT COUNT(*) FROM domain_analytics WHERE session_id IS NOT NULL;

-- Ver últimos registros:
SELECT * FROM streaming_metrics ORDER BY created_at DESC LIMIT 5;
```
```

## ⚠️ Pontos Críticos

1. **SQL PRIMEIRO**: Execute os comandos SQL no Supabase ANTES de atualizar o backend
2. **Validação de Campos**: Os endpoints devem validar campos obrigatórios
3. **Logs Detalhados**: Implementar logs para facilitar debugging
4. **Tratamento de Erros**: Retornar sempre JSON, nunca HTML
5. **CORS**: Verificar se os endpoints aceitam requisições do proxy

## 📊 Monitoramento

Após implementação, verificar:
- [ ] Logs do backend não mostram erros 500
- [ ] Dados aparecem nas tabelas do Supabase
- [ ] Script de teste retorna sucesso
- [ ] Proxy não mostra erros de parsing JSON

## 🚀 Resultado Esperado

Após as correções, o sistema deve funcionar sem erros:

### ✅ **Logs de Sucesso no Proxy**
```
✅ [ANALYTICS] Log de acesso enviado com sucesso
✅ [ANALYTICS] Métricas de episódio enviadas com sucesso
✅ [ANALYTICS] Mudança de sessão registrada com sucesso
```

### ✅ **Endpoints Funcionando**
- `POST /api/analytics/collect-episode-metrics` → Status 200
- `POST /api/analytics/collect-session-change` → Status 200
- Respostas em JSON (não HTML)

### ✅ **Dados no Supabase**
- Tabela `streaming_metrics` criada com 16 colunas
- Campos de episódio adicionados em `access_logs` e `domain_analytics`
- Registros sendo inseridos corretamente

### ✅ **Sistema de Tracking Ativo**
- Detecção automática de mudanças de episódio
- Logging de sessões de streaming
- Analytics detalhados por episódio e série

---

## 📋 **Checklist de Implementação**

- [ ] **SQL executado no Supabase** (`supabase-episode-tracking-schema.sql`)
- [ ] **Endpoints criados no backend** (collect-episode-metrics.post.ts, collect-session-change.post.ts)
- [ ] **Backend Docker reiniciado** (docker-compose up -d --build)
- [ ] **Variáveis de ambiente verificadas** (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] **Teste automático executado** (node test-episode-tracking.js)
- [ ] **Teste manual dos endpoints** (curl commands)
- [ ] **Dados verificados no Supabase** (consultas SQL)

---

**Prioridade**: 🔴 **ALTA** - Sistema de analytics de episódios não funciona sem essas correções.

**Arquivos Criados**:
- ✅ `supabase-episode-tracking-schema.sql` - Schema completo do banco
- ✅ `CORRECAO_BACKEND_EPISODIOS.md` - Documentação completa
- ✅ `test-episode-tracking.js` - Script de teste (já existente)