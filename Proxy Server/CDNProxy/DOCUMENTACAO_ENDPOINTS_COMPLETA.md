# 📋 Documentação Completa - Todos os Endpoints Superadmin

## 🎯 Índice de Endpoints

### 🔐 Autenticação e Perfil
- [Dashboard](#dashboard) - `GET /api/superadmin/dashboard`
- [Perfil](#perfil) - `GET/PUT /api/superadmin/profile`
- [2FA](#2fa) - Autenticação de dois fatores

### 👥 Gerenciamento de Usuários
- [Usuários](#usuarios) - `GET/POST/PUT/DELETE /api/superadmin/users`
- [Administradores](#administradores) - `GET/POST /api/superadmin/admins`

### 🌐 Gerenciamento de Domínios
- [Domínios](#dominios) - `GET/POST/PUT/DELETE /api/superadmin/domains`
- [Analytics de Domínio](#analytics-dominio) - `GET /api/superadmin/domains/[id]/analytics`

### 💰 Planos e Pagamentos
- [Planos](#planos) - `GET/POST/PUT/DELETE /api/superadmin/plans`
- [Pagamentos](#pagamentos) - `GET/DELETE /api/superadmin/payments`

### 📊 Analytics e Relatórios
- [Analytics](#analytics) - `GET /api/superadmin/analytics`
- [Relatórios](#relatorios) - `GET/POST /api/superadmin/reports`
- [Estatísticas](#estatisticas) - `GET /api/superadmin/stats`

### 🖥️ Sistema e Monitoramento
- [Servidores](#servidores) - `GET/POST/PUT/DELETE /api/superadmin/servers`
- [Performance](#performance) - `GET /api/superadmin/performance`
- [Saúde do Sistema](#saude-sistema) - `GET /api/superadmin/system-health`
- [Logs do Sistema](#logs-sistema) - `GET /api/superadmin/system-logs`

### 🔧 Configurações e Utilitários
- [Configuração PIX](#pix-config) - `GET/POST /api/superadmin/pix-config`
- [Cache IP](#cache-ip) - `GET/DELETE /api/superadmin/ip-cache`
- [Notificações](#notificacoes) - `GET/POST /api/superadmin/notifications`

---

## 📋 Detalhamento dos Endpoints

### Dashboard
**Endpoint:** `GET /api/superadmin/dashboard`  
**Descrição:** Dados gerais do painel administrativo

```javascript
// Exemplo de chamada
const dashboardData = await fetch('https://api.cdnproxy.top/api/superadmin/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Resposta esperada
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "SUPERADMIN"
    },
    "stats": {
      "totalUsers": 150,
      "totalDomains": 45,
      "totalTransactions": 1200,
      "usersByRole": {
        "superadmin": 2,
        "admin": 5,
        "user": 143
      }
    }
  }
}
```

### Perfil
**Endpoints:** 
- `GET /api/superadmin/profile` - Obter perfil
- `PUT /api/superadmin/profile` - Atualizar perfil

```javascript
// GET - Obter perfil
const profile = await fetch('https://api.cdnproxy.top/api/superadmin/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// PUT - Atualizar perfil
const updateProfile = await fetch('https://api.cdnproxy.top/api/superadmin/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Novo Nome",
    email: "novo@email.com"
  })
})
```

### 2FA
**Endpoints:**
- `POST /api/superadmin/2fa/setup` - Configurar 2FA
- `POST /api/superadmin/2fa/verify` - Verificar código 2FA
- `POST /api/superadmin/2fa/disable` - Desabilitar 2FA
- `POST /api/superadmin/2fa/backup-codes` - Gerar códigos de backup

```javascript
// Configurar 2FA
const setup2FA = await fetch('https://api.cdnproxy.top/api/superadmin/2fa/setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Verificar código
const verify2FA = await fetch('https://api.cdnproxy.top/api/superadmin/2fa/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: "123456"
  })
})
```

### Usuários
**Endpoints:**
- `GET /api/superadmin/users` - Listar usuários
- `POST /api/superadmin/users` - Criar usuário
- `PUT /api/superadmin/users/[id]` - Atualizar usuário
- `DELETE /api/superadmin/users/[id]` - Deletar usuário
- `PUT /api/superadmin/users/[id]/toggle-status` - Alternar status

**Parâmetros de Query (GET):**
- `page`: Página (padrão: 1)
- `limit`: Itens por página (padrão: 10)
- `search`: Busca por nome/email
- `role`: Filtro por role
- `status`: Filtro por status

```javascript
// Listar usuários com filtros
const users = await fetch('https://api.cdnproxy.top/api/superadmin/users?page=1&limit=20&role=user', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Criar usuário
const createUser = await fetch('https://api.cdnproxy.top/api/superadmin/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Novo Usuário",
    email: "usuario@example.com",
    password: "senha123",
    role: "user"
  })
})
```

### Administradores
**Endpoints:**
- `GET /api/superadmin/admins` - Listar administradores
- `POST /api/superadmin/admins` - Criar administrador

```javascript
// Listar administradores
const admins = await fetch('https://api.cdnproxy.top/api/superadmin/admins', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Criar administrador
const createAdmin = await fetch('https://api.cdnproxy.top/api/superadmin/admins', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Novo Admin",
    email: "admin@example.com",
    password: "senha123",
    role: "admin"
  })
})
```

### Domínios
**Endpoints:**
- `GET /api/superadmin/domains` - Listar domínios
- `POST /api/superadmin/domains` - Criar domínio
- `PUT /api/superadmin/domains` - Atualizar domínio
- `DELETE /api/superadmin/domains` - Deletar domínio
- `PUT /api/superadmin/domains/[id]/status` - Atualizar status
- `PUT /api/superadmin/domains/[id]/renew` - Renovar domínio
- `GET /api/superadmin/domains/[id]/analytics` - Analytics do domínio

**Parâmetros de Query (GET):**
- `page`: Página
- `limit`: Itens por página
- `search`: Busca por nome/domínio
- `status`: Filtro por status
- `user_id`: Filtro por usuário

```javascript
// Listar domínios
const domains = await fetch('https://api.cdnproxy.top/api/superadmin/domains?status=active', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Criar domínio
const createDomain = await fetch('https://api.cdnproxy.top/api/superadmin/domains', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    domain: "exemplo.com",
    user_id: "uuid",
    plan_id: "uuid",
    status: "active"
  })
})

// Analytics de domínio específico
const domainAnalytics = await fetch('https://api.cdnproxy.top/api/superadmin/domains/uuid/analytics', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Planos
**Endpoints:**
- `GET /api/superadmin/plans` - Listar planos
- `POST /api/superadmin/plans` - Criar plano
- `GET /api/superadmin/plans/[id]` - Obter plano específico
- `PUT /api/superadmin/plans/[id]` - Atualizar plano
- `DELETE /api/superadmin/plans/[id]` - Deletar plano

```javascript
// Listar planos
const plans = await fetch('https://api.cdnproxy.top/api/superadmin/plans', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Criar plano
const createPlan = await fetch('https://api.cdnproxy.top/api/superadmin/plans', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Plano Premium",
    description: "Plano com recursos avançados",
    price: 29.90,
    features: ["Feature 1", "Feature 2"],
    limits: {
      domains: 10,
      bandwidth: "100GB"
    }
  })
})
```

### Pagamentos
**Endpoints:**
- `GET /api/superadmin/payments` - Listar pagamentos
- `GET /api/superadmin/payments-simple` - Pagamentos simplificados
- `GET /api/superadmin/payments/[id]` - Pagamento específico
- `DELETE /api/superadmin/payments/[id]` - Deletar pagamento

**Parâmetros de Query (GET):**
- `page`: Página
- `limit`: Itens por página
- `status`: Filtro por status
- `user_id`: Filtro por usuário
- `date_from`: Data inicial
- `date_to`: Data final

```javascript
// Listar pagamentos
const payments = await fetch('https://api.cdnproxy.top/api/superadmin/payments?status=completed', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Pagamentos por período
const paymentsByPeriod = await fetch('https://api.cdnproxy.top/api/superadmin/payments?date_from=2024-01-01&date_to=2024-01-31', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Analytics
**Endpoint:** `GET /api/superadmin/analytics`

**Parâmetros de Query:**
- `period`: Período (1d, 7d, 30d, 90d)
- `metric`: Métrica específica
- `domain_id`: Filtro por domínio

```javascript
// Analytics gerais
const analytics = await fetch('https://api.cdnproxy.top/api/superadmin/analytics?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Resposta esperada
{
  "success": true,
  "data": {
    "period": "30d",
    "metrics": {
      "total_requests": 1500000,
      "unique_visitors": 45000,
      "bandwidth_used": "2.5TB",
      "cache_hit_rate": 85.2
    },
    "charts": {
      "requests_over_time": [...],
      "bandwidth_over_time": [...],
      "top_domains": [...],
      "geographic_distribution": [...]
    }
  }
}
```

### Relatórios
**Endpoints:**
- `GET /api/superadmin/reports` - Listar relatórios
- `POST /api/superadmin/reports/generate` - Gerar relatório

```javascript
// Listar relatórios
const reports = await fetch('https://api.cdnproxy.top/api/superadmin/reports', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Gerar relatório
const generateReport = await fetch('https://api.cdnproxy.top/api/superadmin/reports/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: "monthly",
    period: "2024-01",
    format: "pdf",
    sections: ["users", "domains", "payments", "analytics"]
  })
})
```

### Estatísticas
**Endpoints:**
- `GET /api/superadmin/stats` - Estatísticas gerais
- `GET /api/superadmin/stats-test` - Estatísticas de teste
- `GET /api/superadmin/system-stats` - Estatísticas do sistema
- `GET /api/superadmin/traffic-stats` - Estatísticas de tráfego
- `GET /api/superadmin/security-stats` - Estatísticas de segurança

```javascript
// Estatísticas gerais
const stats = await fetch('https://api.cdnproxy.top/api/superadmin/stats', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Estatísticas de tráfego
const trafficStats = await fetch('https://api.cdnproxy.top/api/superadmin/traffic-stats', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Logs do Sistema
**Endpoints:**
- `GET /api/superadmin/system-logs` - Logs do sistema
- `GET /api/superadmin/security-logs` - Logs de segurança

**Parâmetros de Query:**
- `page`: Página
- `limit`: Itens por página
- `level`: Nível do log (info, warning, error)
- `date_from`: Data inicial
- `date_to`: Data final

```javascript
// Logs do sistema
const systemLogs = await fetch('https://api.cdnproxy.top/api/superadmin/system-logs?level=error&limit=50', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Logs de segurança
const securityLogs = await fetch('https://api.cdnproxy.top/api/superadmin/security-logs', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Configuração PIX
**Endpoints:**
- `GET /api/superadmin/pix-config` - Obter configuração PIX
- `POST /api/superadmin/pix-config` - Atualizar configuração PIX

```javascript
// Obter configuração PIX
const pixConfig = await fetch('https://api.cdnproxy.top/api/superadmin/pix-config', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Atualizar configuração PIX
const updatePixConfig = await fetch('https://api.cdnproxy.top/api/superadmin/pix-config', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pix_key: "nova-chave-pix",
    merchant_name: "Nome do Comerciante",
    merchant_city: "Cidade"
  })
})
```

### Cache IP
**Endpoints:**
- `GET /api/superadmin/ip-cache` - Listar cache de IPs
- `DELETE /api/superadmin/ip-cache/[ip]` - Deletar IP específico do cache
- `POST /api/superadmin/ip-cache/clear-expired` - Limpar IPs expirados

```javascript
// Listar cache de IPs
const ipCache = await fetch('https://api.cdnproxy.top/api/superadmin/ip-cache', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Deletar IP específico
const deleteIP = await fetch('https://api.cdnproxy.top/api/superadmin/ip-cache/192.168.1.1', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
})

// Limpar IPs expirados
const clearExpired = await fetch('https://api.cdnproxy.top/api/superadmin/ip-cache/clear-expired', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Notificações
**Endpoints:**
- `GET /api/superadmin/notifications` - Listar notificações
- `POST /api/superadmin/notifications/mark-read` - Marcar como lida

```javascript
// Listar notificações
const notifications = await fetch('https://api.cdnproxy.top/api/superadmin/notifications', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Marcar notificação como lida
const markRead = await fetch('https://api.cdnproxy.top/api/superadmin/notifications/mark-read', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notification_id: "uuid"
  })
})
```

### Monitoramento
**Endpoints:**
- `GET /api/superadmin/monitoring-servers` - Servidores de monitoramento
- `POST /api/superadmin/monitoring-servers` - Adicionar servidor de monitoramento
- `DELETE /api/superadmin/monitoring-servers/[id]` - Remover servidor
- `GET /api/superadmin/monitoring/api-keys` - Chaves de API
- `POST /api/superadmin/monitoring/api-keys` - Criar chave de API
- `DELETE /api/superadmin/monitoring/api-keys/[id]` - Deletar chave

```javascript
// Servidores de monitoramento
const monitoringServers = await fetch('https://api.cdnproxy.top/api/superadmin/monitoring-servers', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Chaves de API para monitoramento
const apiKeys = await fetch('https://api.cdnproxy.top/api/superadmin/monitoring/api-keys', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Utilitários do Sistema
**Endpoints:**
- `GET /api/superadmin/database` - Informações do banco de dados
- `GET /api/superadmin/table-sizes` - Tamanhos das tabelas
- `GET /api/superadmin/system/services` - Status dos serviços
- `GET /api/superadmin/traffic` - Dados de tráfego
- `POST /api/superadmin/servers/health-check` - Verificação de saúde dos servidores

```javascript
// Informações do banco de dados
const database = await fetch('https://api.cdnproxy.top/api/superadmin/database', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Tamanhos das tabelas
const tableSizes = await fetch('https://api.cdnproxy.top/api/superadmin/table-sizes', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Status dos serviços
const services = await fetch('https://api.cdnproxy.top/api/superadmin/system/services', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## 🔄 Padrões de Implementação

### 1. Service Layer (Recomendado)
```javascript
// services/api.js
class ApiService {
  constructor(baseURL, token) {
    this.baseURL = baseURL
    this.token = token
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
    
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  // Métodos específicos
  getServers(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/superadmin/servers?${query}`)
  }
  
  getPerformance(period = '24h') {
    return this.request(`/api/superadmin/performance?period=${period}`)
  }
  
  getSystemHealth() {
    return this.request('/api/superadmin/system-health')
  }
  
  // ... outros métodos
}

// Uso
const api = new ApiService('https://api.cdnproxy.top', token)
const servers = await api.getServers({ status: 'online' })
```

### 2. Composable Vue.js
```javascript
// composables/useApiService.js
export const useApiService = () => {
  const config = useRuntimeConfig()
  const { $auth } = useNuxtApp()
  
  const createService = () => {
    return new ApiService(config.public.apiBase, $auth.token)
  }
  
  return { createService }
}
```

### 3. React Hook
```javascript
// hooks/useApi.js
import { useState, useCallback } from 'react'

export const useApi = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const apiCall = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`https://api.cdnproxy.top${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return await response.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  return { apiCall, loading, error }
}
```

---

**Esta documentação cobre todos os endpoints disponíveis no backend superadmin. Use como referência para implementar as chamadas corretas no frontend.**