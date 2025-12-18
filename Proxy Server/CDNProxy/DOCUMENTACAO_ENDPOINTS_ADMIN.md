# Documentação dos Endpoints ADMIN - Backend API

## Visão Geral

Esta documentação detalha como o frontend deve chamar os endpoints do **ADMIN** no backend. Os endpoints de admin são destinados a usuários com permissão de administrador (não superadmin) e permitem gerenciar domínios, pagamentos, notificações e perfil do usuário.

## Base URL

```
Produção: https://api.cdnproxy.top
Desenvolvimento: http://localhost:3000
```

## Autenticação

### Método de Autenticação
Todos os endpoints de admin requerem autenticação via **Bearer Token**.

### Headers Obrigatórios
```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

### Como Obter o Token
O token é obtido através do endpoint de login:

```javascript
// Login para obter token
const response = await fetch('https://api.cdnproxy.top/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.token; // Use este token nos headers
```

## Endpoints Principais

### 1. Dashboard do Admin

**Endpoint:** `GET /api/admin/dashboard`

**Descrição:** Retorna dados do dashboard do administrador

**Parâmetros:** Nenhum

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const dashboardData = await response.json();
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "Admin Name",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "stats": {
      "totalDomains": 15,
      "activeDomains": 12,
      "totalTransactions": 25,
      "totalRevenue": 1500.00
    }
  }
}
```

### 2. Gerenciamento de Domínios

#### 2.1 Listar Domínios

**Endpoint:** `GET /api/admin/domains`

**Parâmetros de Query:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `search` (opcional): Buscar por domínio ou URL
- `status` (opcional): Filtrar por status

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/domains?page=1&limit=20&search=example&status=active', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const domainsData = await response.json();
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "domains": [
      {
        "id": "domain-uuid",
        "domain": "example.com",
        "target_url": "https://target.com",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "user_id": "user-uuid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### 2.2 Obter Domínio Específico

**Endpoint:** `GET /api/admin/domains/[id]`

**Parâmetros:**
- `id`: ID do domínio

**Exemplo de Chamada:**
```javascript
const domainId = 'domain-uuid';
const response = await fetch(`https://api.cdnproxy.top/api/admin/domains/${domainId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const domainData = await response.json();
```

#### 2.3 Atualizar Domínio

**Endpoint:** `PATCH /api/admin/domains/[id]`

**Exemplo de Chamada:**
```javascript
const domainId = 'domain-uuid';
const response = await fetch(`https://api.cdnproxy.top/api/admin/domains/${domainId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    domain: 'newdomain.com',
    target_url: 'https://newtarget.com',
    status: 'active'
  })
});

const updatedDomain = await response.json();
```

#### 2.4 Deletar Domínio

**Endpoint:** `DELETE /api/admin/domains/[id]`

**Exemplo de Chamada:**
```javascript
const domainId = 'domain-uuid';
const response = await fetch(`https://api.cdnproxy.top/api/admin/domains/${domainId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
```

#### 2.5 Analytics do Domínio

**Endpoint:** `GET /api/admin/domains/[id]/analytics`

**Parâmetros de Query:**
- `period` (opcional): Período de análise (7d, 30d, 90d)

**Exemplo de Chamada:**
```javascript
const domainId = 'domain-uuid';
const response = await fetch(`https://api.cdnproxy.top/api/admin/domains/${domainId}/analytics?period=30d`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const analyticsData = await response.json();
```

### 3. Gerenciamento de Pagamentos

#### 3.1 Listar Pagamentos

**Endpoint:** `GET /api/admin/payments`

**Parâmetros de Query:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `search` (opcional): Buscar por ID de pagamento
- `status` (opcional): Filtrar por status
- `period` (opcional): Período de tempo

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/payments?page=1&limit=20&status=completed', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const paymentsData = await response.json();
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment-uuid",
        "user_id": "user-uuid",
        "amount": 99.90,
        "type": "subscription",
        "status": "completed",
        "description": "Plano Premium",
        "created_at": "2024-01-01T00:00:00Z",
        "payment_method": "pix",
        "currency": "BRL"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### 3.2 Criar Pagamento

**Endpoint:** `POST /api/admin/payments/create`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/payments/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 99.90,
    type: 'subscription',
    description: 'Plano Premium',
    payment_method: 'pix'
  })
});

const paymentData = await response.json();
```

#### 3.3 Pagamento PIX

**Endpoint:** `POST /api/admin/payments/pix`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/payments/pix', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 99.90,
    description: 'Plano Premium'
  })
});

const pixData = await response.json();
```

#### 3.4 Confirmar PIX

**Endpoint:** `POST /api/admin/payments/confirm-pix`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/payments/confirm-pix', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    payment_id: 'payment-uuid',
    transaction_id: 'pix-transaction-id'
  })
});

const confirmationData = await response.json();
```

### 4. Gerenciamento de Notificações

#### 4.1 Listar Notificações

**Endpoint:** `GET /api/admin/notifications`

**Parâmetros de Query:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 10)
- `read` (opcional): Filtrar por status de leitura (all, read, unread)

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/notifications?page=1&limit=10&read=unread', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const notificationsData = await response.json();
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification-uuid",
        "user_id": "user-uuid",
        "title": "Novo Pagamento",
        "message": "Seu pagamento foi processado com sucesso",
        "type": "payment",
        "read": false,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### 4.2 Marcar Notificação como Lida

**Endpoint:** `POST /api/admin/notifications/mark-read`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/notifications/mark-read', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notification_id: 'notification-uuid'
  })
});

const result = await response.json();
```

### 5. Gerenciamento de Perfil

#### 5.1 Obter Perfil

**Endpoint:** `GET /api/admin/profile`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/profile', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const profileData = await response.json();
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "Admin Name",
      "email": "admin@example.com",
      "role": "ADMIN",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "stats": {
      "domainsCount": 15,
      "transactionsCount": 25
    }
  }
}
```

#### 5.2 Atualizar Perfil

**Endpoint:** `PUT /api/admin/profile`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/profile', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Novo Nome',
    email: 'novoemail@example.com'
  })
});

const updatedProfile = await response.json();
```

### 6. Outros Endpoints

#### 6.1 Carrinho

**Endpoint:** `GET /api/admin/cart`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/cart', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const cartData = await response.json();
```

#### 6.2 Planos

**Endpoint:** `GET /api/admin/plans`

**Exemplo de Chamada:**
```javascript
const response = await fetch('https://api.cdnproxy.top/api/admin/plans', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const plansData = await response.json();
```

#### 6.3 Transações

**Endpoint:** `GET /api/admin/transactions/[id]`

**Exemplo de Chamada:**
```javascript
const transactionId = 'transaction-uuid';
const response = await fetch(`https://api.cdnproxy.top/api/admin/transactions/${transactionId}`, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const transactionData = await response.json();
```

**Endpoint:** `DELETE /api/admin/transactions/[id]`

**Exemplo de Chamada:**
```javascript
const transactionId = 'transaction-uuid';
const response = await fetch(`https://api.cdnproxy.top/api/admin/transactions/${transactionId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
```

## Tratamento de Erros

### Códigos de Status HTTP

- **200**: Sucesso
- **400**: Requisição inválida
- **401**: Não autorizado (token inválido ou ausente)
- **403**: Acesso negado (permissão insuficiente)
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

### Estrutura de Erro Padrão

```json
{
  "success": false,
  "error": "Mensagem de erro",
  "statusCode": 400,
  "statusMessage": "Bad Request"
}
```

### Exemplo de Tratamento de Erro no Frontend

```javascript
async function callAdminAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`https://api.cdnproxy.top/api/admin/${endpoint}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Erro na API:', error.message);
    
    // Tratar diferentes tipos de erro
    if (error.message.includes('401')) {
      // Token expirado - redirecionar para login
      window.location.href = '/login';
    } else if (error.message.includes('403')) {
      // Sem permissão
      alert('Você não tem permissão para acessar este recurso');
    } else {
      // Outros erros
      alert('Erro ao processar solicitação: ' + error.message);
    }
    
    throw error;
  }
}
```

## Implementação no Frontend (Vue.js/Nuxt.js)

### 1. Composable para API Admin

```javascript
// composables/useAdminAPI.js
export const useAdminAPI = () => {
  const { $fetch } = useNuxtApp();
  const token = useCookie('auth-token');

  const apiCall = async (endpoint, options = {}) => {
    return await $fetch(`/api/admin/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token.value}`,
        ...options.headers
      },
      ...options
    });
  };

  return {
    // Dashboard
    getDashboard: () => apiCall('dashboard'),
    
    // Domínios
    getDomains: (params) => apiCall(`domains?${new URLSearchParams(params)}`),
    getDomain: (id) => apiCall(`domains/${id}`),
    updateDomain: (id, data) => apiCall(`domains/${id}`, { method: 'PATCH', body: data }),
    deleteDomain: (id) => apiCall(`domains/${id}`, { method: 'DELETE' }),
    getDomainAnalytics: (id, period) => apiCall(`domains/${id}/analytics?period=${period}`),
    
    // Pagamentos
    getPayments: (params) => apiCall(`payments?${new URLSearchParams(params)}`),
    createPayment: (data) => apiCall('payments/create', { method: 'POST', body: data }),
    createPixPayment: (data) => apiCall('payments/pix', { method: 'POST', body: data }),
    confirmPixPayment: (data) => apiCall('payments/confirm-pix', { method: 'POST', body: data }),
    
    // Notificações
    getNotifications: (params) => apiCall(`notifications?${new URLSearchParams(params)}`),
    markNotificationRead: (id) => apiCall('notifications/mark-read', { method: 'POST', body: { notification_id: id } }),
    
    // Perfil
    getProfile: () => apiCall('profile'),
    updateProfile: (data) => apiCall('profile', { method: 'PUT', body: data }),
    
    // Outros
    getCart: () => apiCall('cart'),
    getPlans: () => apiCall('plans'),
    getTransaction: (id) => apiCall(`transactions/${id}`),
    deleteTransaction: (id) => apiCall(`transactions/${id}`, { method: 'DELETE' })
  };
};
```

### 2. Store Pinia para Admin

```javascript
// stores/admin.js
export const useAdminStore = defineStore('admin', () => {
  const adminAPI = useAdminAPI();
  
  const dashboard = ref(null);
  const domains = ref([]);
  const payments = ref([]);
  const notifications = ref([]);
  const profile = ref(null);
  
  const loading = ref(false);
  const error = ref(null);

  const fetchDashboard = async () => {
    try {
      loading.value = true;
      dashboard.value = await adminAPI.getDashboard();
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const fetchDomains = async (params = {}) => {
    try {
      loading.value = true;
      const response = await adminAPI.getDomains(params);
      domains.value = response.data.domains;
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPayments = async (params = {}) => {
    try {
      loading.value = true;
      const response = await adminAPI.getPayments(params);
      payments.value = response.data.payments;
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    dashboard,
    domains,
    payments,
    notifications,
    profile,
    loading,
    error,
    
    // Actions
    fetchDashboard,
    fetchDomains,
    fetchPayments,
    
    // API methods
    ...adminAPI
  };
});
```

### 3. Componente de Exemplo

```vue
<!-- pages/admin/dashboard.vue -->
<template>
  <div class="admin-dashboard">
    <h1>Dashboard Admin</h1>
    
    <div v-if="loading" class="loading">
      Carregando...
    </div>
    
    <div v-else-if="error" class="error">
      Erro: {{ error }}
    </div>
    
    <div v-else-if="dashboard" class="dashboard-content">
      <div class="stats">
        <div class="stat-card">
          <h3>Total de Domínios</h3>
          <p>{{ dashboard.data.stats.totalDomains }}</p>
        </div>
        <div class="stat-card">
          <h3>Domínios Ativos</h3>
          <p>{{ dashboard.data.stats.activeDomains }}</p>
        </div>
        <div class="stat-card">
          <h3>Total de Transações</h3>
          <p>{{ dashboard.data.stats.totalTransactions }}</p>
        </div>
        <div class="stat-card">
          <h3>Receita Total</h3>
          <p>R$ {{ dashboard.data.stats.totalRevenue }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const adminStore = useAdminStore();
const { dashboard, loading, error } = storeToRefs(adminStore);

// Buscar dados do dashboard ao montar o componente
onMounted(() => {
  adminStore.fetchDashboard();
});
</script>
```

## Pontos Importantes para Correção

### 1. Autenticação
- **Sempre** incluir o header `Authorization: Bearer TOKEN`
- Verificar se o token não expirou
- Implementar renovação automática de token

### 2. Tratamento de Erros
- Implementar tratamento adequado para códigos 401, 403, 404, 500
- Mostrar mensagens de erro amigáveis ao usuário
- Log de erros para debugging

### 3. Paginação
- Implementar paginação adequada para listas grandes
- Usar parâmetros `page` e `limit` consistentemente

### 4. Loading States
- Mostrar indicadores de carregamento durante requisições
- Desabilitar botões durante operações

### 5. Cache e Performance
- Implementar cache para dados que não mudam frequentemente
- Usar debounce para buscas em tempo real

## Checklist de Implementação

- [ ] Configurar base URL correta (produção/desenvolvimento)
- [ ] Implementar sistema de autenticação com Bearer Token
- [ ] Criar composables/services para chamadas de API
- [ ] Implementar store/estado global para dados admin
- [ ] Adicionar tratamento de erros adequado
- [ ] Implementar paginação nas listagens
- [ ] Adicionar loading states
- [ ] Testar todos os endpoints em produção
- [ ] Verificar permissões de acesso
- [ ] Implementar renovação automática de token

## Verificação

Para verificar se a implementação está correta:

1. **Teste de Autenticação**: Verifique se o token está sendo enviado corretamente
2. **Teste de Endpoints**: Teste cada endpoint individualmente
3. **Teste de Erros**: Simule erros 401, 403, 404 e verifique o tratamento
4. **Teste de Paginação**: Verifique se a paginação funciona corretamente
5. **Teste de Performance**: Verifique tempos de resposta e loading states

Esta documentação fornece uma base sólida para implementar corretamente as chamadas aos endpoints de ADMIN no frontend.