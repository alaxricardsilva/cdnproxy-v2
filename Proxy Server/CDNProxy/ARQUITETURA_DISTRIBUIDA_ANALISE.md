# Análise da Arquitetura Distribuída - CDN Proxy

## 📋 Resumo Executivo

Este documento analisa a arquitetura distribuída do sistema CDN Proxy e explica como o processamento de IPs funciona entre os diferentes servidores.

## 🏗️ Arquitetura do Sistema

### Componentes Distribuídos

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DISTRIBUÍDA                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   PROXY SERVER  │    │    FRONTEND     │                │
│  │ gf.proxysrv.top │    │app.cdnproxy.top │                │
│  │                 │    │   (Docker)      │                │
│  │ - proxy-server.js│    │ - Interface Web │                │
│  │ - Middleware    │    │ - Dashboard     │                │
│  │ - Geolocalização│    │ - Autenticação  │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           │              ┌─────────────────┐               │
│           └──────────────▶│     BACKEND     │               │
│                          │api.cdnproxy.top │               │
│                          │   (Docker)      │               │
│                          │ - APIs REST     │               │
│                          │ - Supabase      │               │
│                          │ - Autenticação  │               │
│                          └─────────────────┘               │
│                                   │                        │
│                          ┌─────────────────┐               │
│                          │    SUPABASE     │               │
│                          │   (Database)    │               │
│                          │ - ip_geo_cache  │               │
│                          │ - access_logs   │               │
│                          │ - domains       │               │
│                          └─────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Processamento de IPs

1. **Entrada de Requisição**
   - Usuário acessa domínio personalizado
   - Requisição chega ao `proxy-server.js` em `gf.proxysrv.top`

2. **Processamento no Proxy Server**
   - Middleware extrai IP do cliente
   - Verifica se é domínio personalizado válido
   - Chama função de geolocalização

3. **Geolocalização**
   - Consulta cache local (memória)
   - Se não encontrado, consulta Supabase
   - Se não encontrado, consulta APIs externas
   - Salva resultado no cache

4. **Registro de Logs**
   - Salva log de acesso no Supabase
   - Inclui dados de geolocalização

## 🔍 Análise da Discrepância de Geolocalização

### Problema Identificado

**IP Analisado:** `201.182.93.164`

**Discrepância Encontrada:**
- **Cache (Supabase):** São Paulo, São Paulo, Brazil
- **APIs Atuais:** Cabo de Santo Agostinho, Pernambuco, Brazil

### Resultados da Investigação

#### 1. Dados do Cache
```json
{
  "country": "Brazil",
  "city": "São Paulo", 
  "region": "São Paulo",
  "created_at": "2025-10-19T11:47:01.312679+00:00",
  "expires_at": "2025-10-20T11:47:00.996+00:00",
  "status": "✅ Válido"
}
```

#### 2. Dados das APIs Atuais
```json
{
  "ip-api.com": {
    "country": "Brazil",
    "city": "Cabo de Santo Agostinho",
    "region": "Pernambuco"
  },
  "ipapi.co": {
    "country": "Brazil", 
    "city": "Cabo de Santo Agostinho",
    "region": "Pernambuco"
  },
  "ipinfo.io": {
    "country": "BR",
    "city": "Cabo de Santo Agostinho", 
    "region": "Pernambuco"
  }
}
```

### 🎯 Conclusões da Análise

#### 1. **Consistência entre APIs**
- ✅ Todas as 3 APIs retornam a mesma localização atual
- ✅ Consenso: Cabo de Santo Agostinho, Pernambuco

#### 2. **Idade do Cache**
- ⚠️ Cache criado há poucas horas (mesmo dia)
- ⚠️ Discrepância não é devido à idade do cache

#### 3. **Possíveis Causas da Discrepância**

**A. Mudança Real de Localização do IP**
- IP pode ter sido reatribuído geograficamente
- Provedor pode ter mudado roteamento

**B. Diferença entre Fontes de Dados**
- Cache pode ter sido criado com dados de API diferente
- Possível inconsistência temporária entre APIs

**C. Processamento Manual ou Teste**
- IP pode ter sido inserido manualmente para testes
- Dados podem ter sido sobrescritos

## 🔄 Fluxo de Processamento Detalhado

### 1. Middleware de Geolocalização (proxy-server.js)

```javascript
// Fluxo simplificado
async function processRequest(req, res, next) {
  const clientIP = getClientIP(req);
  const domain = getDomain(req);
  
  if (isCustomDomain(domain)) {
    const geoData = await getGeolocation(clientIP);
    
    // Registra log de acesso
    await logAccess({
      client_ip: clientIP,
      domain: domain,
      country: geoData.country,
      city: geoData.city,
      // ... outros dados
    });
  }
  
  next();
}
```

### 2. Função de Geolocalização

```javascript
async function getGeolocation(ip) {
  // 1. Cache em memória
  if (memoryCache.has(ip)) {
    return memoryCache.get(ip);
  }
  
  // 2. Cache no Supabase
  const cached = await getFromSupabaseCache(ip);
  if (cached && !isExpired(cached)) {
    memoryCache.set(ip, cached);
    return cached;
  }
  
  // 3. APIs externas (com fallback)
  const geoData = await getFromAPIs(ip);
  
  // 4. Salvar no cache
  await saveToSupabaseCache(ip, geoData);
  memoryCache.set(ip, geoData);
  
  return geoData;
}
```

## 📊 Pontos de Entrada para Processamento de IPs

### 1. **Middleware Principal (proxy-server.js)**
- ✅ Processa IPs de domínios personalizados
- ✅ Registra logs de acesso
- ✅ Aplica geolocalização

### 2. **APIs de Teste**
- ✅ `/api/test-geolocation` (GET)
- ✅ `/api/test/geolocation` (POST)
- ⚠️ Podem processar IPs sem registrar logs de acesso

### 3. **Scripts de Análise/Debug**
- ✅ Vários scripts chamam `getGeolocation` diretamente
- ⚠️ Podem inserir dados no cache sem logs

### 4. **Processamento Manual**
- ⚠️ Possível inserção manual de dados
- ⚠️ Scripts de migração ou correção

## 🚨 Recomendações

### 1. **Atualização do Cache**
```bash
# Limpar cache expirado para o IP específico
DELETE FROM ip_geo_cache WHERE ip = '201.182.93.164';
```

### 2. **Monitoramento de Discrepâncias**
- Implementar alertas para discrepâncias significativas
- Log de mudanças de geolocalização

### 3. **Validação de Dados**
- Comparar múltiplas APIs antes de cachear
- Implementar consenso entre APIs

### 4. **Documentação de Processos**
- Documentar todos os pontos de entrada
- Rastrear origem dos dados no cache

## 📈 Próximos Passos

1. **Investigar Origem do Cache Incorreto**
   - Verificar logs de quando o IP foi inserido
   - Identificar qual processo criou o registro

2. **Implementar Validação Cruzada**
   - Consultar múltiplas APIs simultaneamente
   - Usar consenso para determinar localização

3. **Melhorar Rastreabilidade**
   - Adicionar campo `source` na tabela de cache
   - Registrar qual API/processo inseriu os dados

4. **Otimizar Arquitetura Distribuída**
   - Considerar cache distribuído entre servidores
   - Implementar sincronização de dados

---

**Data da Análise:** 19 de Outubro de 2025  
**Status:** Discrepância identificada e analisada  
**Próxima Ação:** Atualizar cache e implementar validação cruzada