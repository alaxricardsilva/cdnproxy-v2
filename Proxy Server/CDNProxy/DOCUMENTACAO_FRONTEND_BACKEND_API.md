# 📚 Documentação Completa - Frontend ↔ Backend API

## 🎯 Visão Geral

Esta documentação detalha como o frontend deve fazer chamadas corretas para todos os endpoints do backend, especialmente para os painéis `/superadmin/performance` e `/superadmin/monitoring` exibirem dados reais dos servidores.

## 🔐 Autenticação

### Headers Obrigatórios
Todos os endpoints do superadmin requerem autenticação via Bearer Token:

```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Obtenção do Token
O token deve ser obtido através do endpoint de login:

```javascript
// POST /api/auth/login
const response = await fetch('https://api.cdnproxy.top/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'password'
  })
})

const { access_token } = await response.json()
```

## 🖥️ Endpoints de Servidores (Principais)

### 1. `/api/superadmin/servers` - Lista de Servidores

**Método:** `GET`  
**URL:** `https://api.cdnproxy.top/api/superadmin/servers`

**Parâmetros de Query (Opcionais):**
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 10)
- `search`: Busca por nome/hostname
- `status`: Filtro por status (online, offline, maintenance)
- `region`: Filtro por região

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Servidor 1 Brasil - Frontend",
      "hostname": "app.cdnproxy.top",
      "ip_address": "IP_ADDRESS",
      "type": "frontend",
      "status": "online",
      "location": "Brasil",
      "description": "Servidor frontend principal",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "metrics": {
        "cpu_usage": 45.2,
        "memory_usage": 67.8,
        "disk_usage": 34.1,
        "uptime": 99.9,
        "response_time": 120,
        "last_check": "2024-01-01T00:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  },
  "stats": {
    "total": 3,
    "online": 2,
    "offline": 0,
    "maintenance": 0,
    "alerts": 1
  }
}
```

**Exemplo de Chamada no Frontend:**
```javascript
async function fetchServers() {
  try {
    const response = await fetch('https://api.cdnproxy.top/api/superadmin/servers', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data // Array de servidores
  } catch (error) {
    console.error('Erro ao buscar servidores:', error)
    throw error
  }
}
```

### 2. `/api/superadmin/performance` - Métricas de Performance

**Método:** `GET`  
**URL:** `https://api.cdnproxy.top/api/superadmin/performance`

**Parâmetros de Query (Opcionais):**
- `period`: Período dos dados (1h, 24h, 7d, 30d)
- `server_id`: ID específico do servidor

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": [
    {
      "server_id": "uuid",
      "server_name": "Servidor 1 Brasil - Frontend",
      "hostname": "app.cdnproxy.top",
      "current_metrics": {
        "cpu": 45.2,
        "memory": 67.8,
        "response_time": 120,
        "uptime": 99.9,
        "disk_usage": 34.1
      },
      "system_info": {
        "os": "Linux",
        "version": "Ubuntu 22.04",
        "architecture": "x64",
        "cores": 4,
        "total_memory": "8GB"
      },
      "historical_data": {
        "cpu": [
          { "timestamp": "2024-01-01T00:00:00Z", "value": 45.2 },
          { "timestamp": "2024-01-01T01:00:00Z", "value": 42.1 }
        ],
        "memory": [
          { "timestamp": "2024-01-01T00:00:00Z", "value": 67.8 },
          { "timestamp": "2024-01-01T01:00:00Z", "value": 65.3 }
        ],
        "response_time": [
          { "timestamp": "2024-01-01T00:00:00Z", "value": 120 },
          { "timestamp": "2024-01-01T01:00:00Z", "value": 115 }
        ]
      }
    }
  ],
  "aggregated_stats": {
    "avg_cpu": 43.65,
    "avg_memory": 66.55,
    "avg_response_time": 117.5,
    "total_servers": 2,
    "healthy_servers": 2
  }
}
```

**Exemplo de Chamada no Frontend:**
```javascript
async function fetchPerformanceData(period = '24h') {
  try {
    const response = await fetch(`https://api.cdnproxy.top/api/superadmin/performance?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    return data.data // Array de dados de performance
  } catch (error) {
    console.error('Erro ao buscar dados de performance:', error)
    throw error
  }
}
```

### 3. `/api/superadmin/system-health` - Saúde do Sistema

**Método:** `GET`  
**URL:** `https://api.cdnproxy.top/api/superadmin/system-health`

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "overall_status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "system_metrics": {
      "cpu_usage": 45.2,
      "memory_usage": 67.8,
      "uptime": 99.9,
      "load_average": [1.2, 1.1, 1.0]
    },
    "servers": [
      {
        "id": "uuid",
        "name": "Servidor 1 Brasil - Frontend",
        "hostname": "app.cdnproxy.top",
        "status": "online",
        "type": "frontend",
        "response_time": 120,
        "last_activity": "2024-01-01T00:00:00Z",
        "health_score": 95
      },
      {
        "id": "uuid",
        "name": "Servidor 2 Alemanha - Backend",
        "hostname": "api.cdnproxy.top",
        "status": "online",
        "type": "backend",
        "response_time": 85,
        "last_activity": "2024-01-01T00:00:00Z",
        "health_score": 98
      },
      {
        "id": "uuid",
        "name": "Proxy CDN Server",
        "hostname": "proxy.cdnproxy.top",
        "status": "online",
        "type": "proxy",
        "response_time": 95,
        "last_activity": "2024-01-01T00:00:00Z",
        "health_score": 97
      }
    ],
    "alerts": [
      {
        "level": "warning",
        "message": "CPU usage above 80% on server 1",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

**Exemplo de Chamada no Frontend:**
```javascript
async function fetchSystemHealth() {
  try {
    const response = await fetch('https://api.cdnproxy.top/api/superadmin/system-health', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    return data.data // Dados de saúde do sistema
  } catch (error) {
    console.error('Erro ao buscar saúde do sistema:', error)
    throw error
  }
}
```

## 📊 Outros Endpoints Importantes

### Dashboard - `/api/superadmin/dashboard`
**Método:** `GET`  
**Descrição:** Dados gerais do painel administrativo

### Analytics - `/api/superadmin/analytics`
**Método:** `GET`  
**Descrição:** Dados de analytics e estatísticas

### Users - `/api/superadmin/users`
**Método:** `GET`, `POST`, `PUT`, `DELETE`  
**Descrição:** Gerenciamento de usuários

### Domains - `/api/superadmin/domains`
**Método:** `GET`, `POST`, `PUT`, `DELETE`  
**Descrição:** Gerenciamento de domínios

### Plans - `/api/superadmin/plans`
**Método:** `GET`, `POST`, `PUT`, `DELETE`  
**Descrição:** Gerenciamento de planos

### Payments - `/api/superadmin/payments`
**Método:** `GET`  
**Descrição:** Histórico de pagamentos

### Reports - `/api/superadmin/reports`
**Método:** `GET`, `POST`  
**Descrição:** Geração e listagem de relatórios

## 🚨 Tratamento de Erros

### Códigos de Status HTTP
- `200`: Sucesso
- `400`: Requisição inválida
- `401`: Não autorizado (token inválido/expirado)
- `403`: Acesso negado (permissões insuficientes)
- `404`: Recurso não encontrado
- `500`: Erro interno do servidor

### Estrutura de Erro Padrão
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "statusCode": 400,
  "statusMessage": "Bad Request"
}
```

### Exemplo de Tratamento no Frontend
```javascript
async function makeApiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      // Tratar erro específico
      if (response.status === 401) {
        // Token expirado - redirecionar para login
        window.location.href = '/login'
        return
      }
      
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    console.error('Erro na API:', error)
    throw error
  }
}
```

## 🔄 Implementação no Frontend

### 1. Composable para API (Vue.js/Nuxt.js)
```javascript
// composables/useApi.js
export const useApi = () => {
  const config = useRuntimeConfig()
  const { $auth } = useNuxtApp()
  
  const apiCall = async (endpoint, options = {}) => {
    const token = $auth.token
    
    const response = await $fetch(`${config.public.apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    return response
  }
  
  return { apiCall }
}
```

### 2. Store para Servidores (Pinia/Vuex)
```javascript
// stores/servers.js
export const useServersStore = defineStore('servers', {
  state: () => ({
    servers: [],
    performanceData: [],
    systemHealth: null,
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchServers() {
      this.loading = true
      try {
        const { apiCall } = useApi()
        const response = await apiCall('/api/superadmin/servers')
        this.servers = response.data
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    
    async fetchPerformanceData(period = '24h') {
      try {
        const { apiCall } = useApi()
        const response = await apiCall(`/api/superadmin/performance?period=${period}`)
        this.performanceData = response.data
      } catch (error) {
        this.error = error.message
      }
    },
    
    async fetchSystemHealth() {
      try {
        const { apiCall } = useApi()
        const response = await apiCall('/api/superadmin/system-health')
        this.systemHealth = response.data
      } catch (error) {
        this.error = error.message
      }
    }
  }
})
```

### 3. Componente de Monitoramento
```vue
<!-- components/ServerMonitoring.vue -->
<template>
  <div class="server-monitoring">
    <div v-if="loading" class="loading">
      Carregando dados dos servidores...
    </div>
    
    <div v-else-if="error" class="error">
      Erro: {{ error }}
    </div>
    
    <div v-else class="servers-grid">
      <div 
        v-for="server in servers" 
        :key="server.id" 
        class="server-card"
        :class="{ 
          'online': server.status === 'online',
          'offline': server.status === 'offline',
          'maintenance': server.status === 'maintenance'
        }"
      >
        <h3>{{ server.name }}</h3>
        <p>{{ server.hostname }}</p>
        <div class="metrics">
          <div>CPU: {{ server.metrics.cpu_usage }}%</div>
          <div>Memória: {{ server.metrics.memory_usage }}%</div>
          <div>Resposta: {{ server.metrics.response_time }}ms</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const serversStore = useServersStore()
const { servers, loading, error } = storeToRefs(serversStore)

onMounted(() => {
  serversStore.fetchServers()
})

// Atualizar dados a cada 30 segundos
const interval = setInterval(() => {
  serversStore.fetchServers()
}, 30000)

onUnmounted(() => {
  clearInterval(interval)
})
</script>
```

## 🎯 Pontos Importantes para Correção

### 1. Problema Atual
O frontend está mostrando apenas "localhost" porque provavelmente:
- Não está fazendo chamadas para os endpoints corretos
- Está usando dados mockados ou em cache
- Há filtros que limitam a exibição apenas ao servidor local

### 2. Solução
- Usar as URLs completas: `https://api.cdnproxy.top/api/superadmin/*`
- Implementar tratamento correto de erros e loading states
- Garantir que o token de autenticação seja válido
- Limpar cache do navegador se necessário

### 3. Verificação
Para verificar se está funcionando:
```javascript
// No console do navegador
fetch('https://api.cdnproxy.top/api/superadmin/servers', {
  headers: { 'Authorization': 'Bearer SEU_TOKEN_AQUI' }
})
.then(r => r.json())
.then(console.log)
```

## 📝 Checklist de Implementação

- [ ] Configurar URL base da API corretamente
- [ ] Implementar sistema de autenticação com tokens
- [ ] Criar composables/services para chamadas da API
- [ ] Implementar stores para gerenciar estado
- [ ] Adicionar tratamento de erros robusto
- [ ] Implementar loading states
- [ ] Configurar atualização automática dos dados
- [ ] Testar todos os endpoints
- [ ] Verificar se os 3 servidores aparecem corretamente
- [ ] Implementar cache inteligente quando necessário

---

**Última atualização:** Outubro 2025  
**Versão:** 1.2.7