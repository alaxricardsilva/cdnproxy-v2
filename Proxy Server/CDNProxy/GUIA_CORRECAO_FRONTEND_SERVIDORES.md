# 🔧 Guia de Correção - Frontend Mostrando Apenas "localhost"

## 🎯 Problema Identificado

O frontend em `https://app.cdnproxy.top` está mostrando apenas "localhost" nas páginas de monitoramento e performance, quando deveria exibir os 3 servidores reais:

- ✅ **Servidor 1 Brasil - Frontend** (app.cdnproxy.top)
- ✅ **Servidor 2 Alemanha - Backend** (api.cdnproxy.top)  
- ✅ **Proxy CDN Server** (proxy.cdnproxy.top)

## 🔍 Diagnóstico Confirmado

### Backend Funcionando Corretamente ✅
Os endpoints do backend estão retornando os dados corretos:

```bash
# Teste confirmado - 3 servidores retornados
curl -H "Authorization: Bearer TOKEN" https://api.cdnproxy.top/api/superadmin/servers
curl -H "Authorization: Bearer TOKEN" https://api.cdnproxy.top/api/superadmin/performance  
curl -H "Authorization: Bearer TOKEN" https://api.cdnproxy.top/api/superadmin/system-health
```

### Problema no Frontend ❌
O frontend não está processando corretamente os dados recebidos do backend.

## 🛠️ Soluções Passo a Passo

### 1. Verificar Configuração da URL Base da API

**Arquivo a verificar:** `nuxt.config.ts` ou `.env`

```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBase: 'https://api.cdnproxy.top', // ✅ Deve ser esta URL
      // NÃO deve ser: 'http://localhost:3000' ❌
    }
  }
})
```

**Ou no arquivo `.env`:**
```bash
NUXT_PUBLIC_API_BASE=https://api.cdnproxy.top
```

### 2. Verificar Chamadas da API no Frontend

**Localizar arquivos que fazem chamadas para servidores:**
- `pages/superadmin/monitoring.vue`
- `pages/superadmin/performance.vue`
- `composables/useServers.js`
- `stores/servers.js`

**Exemplo de correção:**

```javascript
// ❌ ERRADO - URL hardcoded ou localhost
const response = await fetch('http://localhost:3000/api/superadmin/servers')

// ✅ CORRETO - Usar configuração dinâmica
const config = useRuntimeConfig()
const response = await fetch(`${config.public.apiBase}/api/superadmin/servers`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### 3. Verificar Processamento dos Dados

**Problema comum:** O frontend pode estar filtrando apenas servidores "localhost"

```javascript
// ❌ ERRADO - Filtro que mostra apenas localhost
const servers = data.filter(server => server.hostname === 'localhost')

// ✅ CORRETO - Mostrar todos os servidores
const servers = data // Todos os servidores
// OU filtrar por status ativo
const servers = data.filter(server => server.status === 'online')
```

### 4. Verificar Estado/Store da Aplicação

**Se usando Pinia/Vuex:**

```javascript
// stores/servers.js
export const useServersStore = defineStore('servers', {
  state: () => ({
    servers: [], // ✅ Deve conter os 3 servidores
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchServers() {
      this.loading = true
      try {
        const config = useRuntimeConfig()
        const { $auth } = useNuxtApp()
        
        const response = await $fetch(`${config.public.apiBase}/api/superadmin/servers`, {
          headers: {
            'Authorization': `Bearer ${$auth.token}`
          }
        })
        
        // ✅ IMPORTANTE: Armazenar TODOS os servidores
        this.servers = response.data // Array com 3 servidores
        
      } catch (error) {
        this.error = error.message
        console.error('Erro ao buscar servidores:', error)
      } finally {
        this.loading = false
      }
    }
  }
})
```

### 5. Verificar Componentes de Exibição

**Exemplo de componente correto:**

```vue
<!-- components/ServersList.vue -->
<template>
  <div class="servers-list">
    <div v-if="loading" class="loading">
      Carregando servidores...
    </div>
    
    <div v-else-if="error" class="error">
      Erro: {{ error }}
    </div>
    
    <div v-else-if="servers.length === 0" class="empty">
      Nenhum servidor encontrado
    </div>
    
    <div v-else class="servers-grid">
      <!-- ✅ DEVE mostrar os 3 servidores -->
      <div 
        v-for="server in servers" 
        :key="server.id"
        class="server-card"
      >
        <h3>{{ server.name }}</h3>
        <p>{{ server.hostname }}</p>
        <span class="status" :class="server.status">
          {{ server.status }}
        </span>
        <div class="metrics">
          <div>CPU: {{ server.metrics?.cpu_usage || 0 }}%</div>
          <div>Memória: {{ server.metrics?.memory_usage || 0 }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const serversStore = useServersStore()
const { servers, loading, error } = storeToRefs(serversStore)

onMounted(async () => {
  await serversStore.fetchServers()
  console.log('Servidores carregados:', servers.value) // ✅ Debug
})
</script>
```

### 6. Limpar Cache do Navegador

**Passos para o usuário:**
1. Abrir DevTools (F12)
2. Ir na aba **Network**
3. Clicar com botão direito e selecionar **Clear browser cache**
4. Ou usar **Ctrl+Shift+R** para hard refresh

### 7. Verificar Logs do Console

**No navegador (F12 → Console), verificar:**

```javascript
// ✅ Teste manual no console
fetch('https://api.cdnproxy.top/api/superadmin/servers', {
  headers: {
    'Authorization': 'Bearer SEU_TOKEN_AQUI'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Servidores do backend:', data.data)
  console.log('Quantidade:', data.data.length) // Deve ser 3
})
```

## 🔧 Script de Diagnóstico

Criar arquivo `debug-frontend-servers.js` para testar:

```javascript
// debug-frontend-servers.js
async function debugServers() {
  const token = 'SEU_TOKEN_AQUI' // Obter do localStorage ou sessionStorage
  
  try {
    console.log('🔍 Testando endpoints...')
    
    // Teste 1: Servidores
    const serversResponse = await fetch('https://api.cdnproxy.top/api/superadmin/servers', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const serversData = await serversResponse.json()
    console.log('✅ Servidores:', serversData.data.length, serversData.data)
    
    // Teste 2: Performance
    const perfResponse = await fetch('https://api.cdnproxy.top/api/superadmin/performance', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const perfData = await perfResponse.json()
    console.log('✅ Performance:', perfData.data.length, perfData.data)
    
    // Teste 3: System Health
    const healthResponse = await fetch('https://api.cdnproxy.top/api/superadmin/system-health', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const healthData = await healthResponse.json()
    console.log('✅ System Health:', healthData.data.servers.length, healthData.data.servers)
    
    // Verificar se todos retornam 3 servidores
    const counts = [
      serversData.data.length,
      perfData.data.length, 
      healthData.data.servers.length
    ]
    
    if (counts.every(count => count === 3)) {
      console.log('🎉 Backend está retornando 3 servidores corretamente!')
      console.log('❌ Problema está no frontend - verificar processamento dos dados')
    } else {
      console.log('⚠️ Inconsistência nos dados do backend:', counts)
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

// Executar
debugServers()
```

## 📋 Checklist de Correção

### Configuração
- [ ] Verificar `nuxt.config.ts` - URL da API está correta
- [ ] Verificar arquivo `.env` - variáveis de ambiente corretas
- [ ] Verificar se não há URLs hardcoded para localhost

### Código Frontend
- [ ] Verificar composables/stores que fazem chamadas da API
- [ ] Verificar se não há filtros limitando a localhost
- [ ] Verificar processamento dos dados recebidos
- [ ] Verificar componentes de exibição

### Testes
- [ ] Testar endpoints manualmente no console
- [ ] Verificar logs de erro no console
- [ ] Verificar Network tab no DevTools
- [ ] Limpar cache do navegador

### Validação Final
- [ ] Página de monitoramento mostra 3 servidores
- [ ] Página de performance mostra dados dos 3 servidores
- [ ] Métricas estão sendo atualizadas corretamente
- [ ] Não há erros no console

## 🎯 Resultado Esperado

Após as correções, o frontend deve exibir:

### Página de Monitoramento
```
┌─────────────────────────────────┐
│ Servidor 1 Brasil - Frontend    │
│ app.cdnproxy.top               │
│ Status: Online                 │
│ CPU: 45% | Mem: 67%           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Servidor 2 Alemanha - Backend   │
│ api.cdnproxy.top               │
│ Status: Online                 │
│ CPU: 32% | Mem: 54%           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Proxy CDN Server               │
│ proxy.cdnproxy.top             │
│ Status: Online                 │
│ CPU: 28% | Mem: 41%           │
└─────────────────────────────────┘
```

### Página de Performance
- Gráficos com dados dos 3 servidores
- Métricas individuais por servidor
- Comparação entre servidores
- Dados históricos funcionando

## 🆘 Se o Problema Persistir

1. **Verificar autenticação:** Token pode estar expirado
2. **Verificar CORS:** Pode haver problema de CORS entre domínios
3. **Verificar proxy/CDN:** Pode estar cacheando respostas antigas
4. **Verificar build:** Fazer novo build do frontend
5. **Verificar deployment:** Verificar se a versão correta foi deployada

---

**Este guia deve resolver o problema do frontend mostrando apenas "localhost". Siga os passos em ordem e teste após cada correção.**