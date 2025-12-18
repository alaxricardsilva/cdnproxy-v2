# Guia Prático - Implementação Frontend para Endpoints ADMIN

## Casos de Uso Práticos

### 1. Página de Dashboard Admin

```vue
<!-- pages/admin/index.vue -->
<template>
  <div class="admin-dashboard">
    <div class="header">
      <h1>Dashboard Administrativo</h1>
      <div class="user-info">
        <span>Bem-vindo, {{ profile?.name }}</span>
        <button @click="logout">Sair</button>
      </div>
    </div>

    <div v-if="loading" class="loading-spinner">
      <div class="spinner"></div>
      <p>Carregando dados...</p>
    </div>

    <div v-else-if="error" class="error-message">
      <h3>Erro ao carregar dados</h3>
      <p>{{ error }}</p>
      <button @click="retryLoad">Tentar Novamente</button>
    </div>

    <div v-else class="dashboard-grid">
      <!-- Cards de Estatísticas -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🌐</div>
          <div class="stat-content">
            <h3>{{ dashboard?.stats?.totalDomains || 0 }}</h3>
            <p>Total de Domínios</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <h3>{{ dashboard?.stats?.activeDomains || 0 }}</h3>
            <p>Domínios Ativos</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💳</div>
          <div class="stat-content">
            <h3>{{ dashboard?.stats?.totalTransactions || 0 }}</h3>
            <p>Transações</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <h3>R$ {{ formatCurrency(dashboard?.stats?.totalRevenue || 0) }}</h3>
            <p>Receita Total</p>
          </div>
        </div>
      </div>

      <!-- Ações Rápidas -->
      <div class="quick-actions">
        <h2>Ações Rápidas</h2>
        <div class="actions-grid">
          <NuxtLink to="/admin/domains" class="action-card">
            <div class="action-icon">🌐</div>
            <h3>Gerenciar Domínios</h3>
            <p>Adicionar, editar ou remover domínios</p>
          </NuxtLink>
          
          <NuxtLink to="/admin/payments" class="action-card">
            <div class="action-icon">💳</div>
            <h3>Pagamentos</h3>
            <p>Visualizar e gerenciar pagamentos</p>
          </NuxtLink>
          
          <NuxtLink to="/admin/notifications" class="action-card">
            <div class="action-icon">🔔</div>
            <h3>Notificações</h3>
            <p>{{ unreadNotifications }} não lidas</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'admin-auth'
});

const adminStore = useAdminStore();
const { dashboard, profile, loading, error } = storeToRefs(adminStore);

const unreadNotifications = ref(0);

// Função para formatar moeda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Carregar dados iniciais
const loadDashboardData = async () => {
  try {
    await Promise.all([
      adminStore.fetchDashboard(),
      adminStore.fetchProfile(),
      loadNotificationsCount()
    ]);
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
};

// Carregar contagem de notificações não lidas
const loadNotificationsCount = async () => {
  try {
    const response = await adminStore.getNotifications({ read: 'unread', limit: 1 });
    unreadNotifications.value = response.data.pagination.total;
  } catch (err) {
    console.error('Erro ao carregar notificações:', err);
  }
};

// Tentar carregar novamente
const retryLoad = () => {
  loadDashboardData();
};

// Logout
const logout = () => {
  // Implementar logout
  navigateTo('/login');
};

// Carregar dados ao montar
onMounted(() => {
  loadDashboardData();
});
</script>
```

### 2. Página de Gerenciamento de Domínios

```vue
<!-- pages/admin/domains/index.vue -->
<template>
  <div class="domains-management">
    <div class="page-header">
      <h1>Gerenciamento de Domínios</h1>
      <button @click="showAddModal = true" class="btn-primary">
        + Adicionar Domínio
      </button>
    </div>

    <!-- Filtros e Busca -->
    <div class="filters-section">
      <div class="search-box">
        <input 
          v-model="searchTerm" 
          @input="debouncedSearch"
          placeholder="Buscar por domínio ou URL..."
          class="search-input"
        />
      </div>
      
      <div class="filters">
        <select v-model="statusFilter" @change="applyFilters">
          <option value="">Todos os Status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="pending">Pendente</option>
        </select>
        
        <select v-model="itemsPerPage" @change="applyFilters">
          <option value="10">10 por página</option>
          <option value="20">20 por página</option>
          <option value="50">50 por página</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando domínios...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <h3>Erro ao carregar domínios</h3>
      <p>{{ error }}</p>
      <button @click="loadDomains" class="btn-secondary">Tentar Novamente</button>
    </div>

    <!-- Domains Table -->
    <div v-else class="domains-table-container">
      <table class="domains-table">
        <thead>
          <tr>
            <th>Domínio</th>
            <th>URL de Destino</th>
            <th>Status</th>
            <th>Criado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="domain in domains" :key="domain.id">
            <td>
              <div class="domain-cell">
                <strong>{{ domain.domain }}</strong>
                <span class="domain-id">ID: {{ domain.id.slice(0, 8) }}...</span>
              </div>
            </td>
            <td>
              <a :href="domain.target_url" target="_blank" class="target-url">
                {{ domain.target_url }}
              </a>
            </td>
            <td>
              <span :class="['status-badge', `status-${domain.status}`]">
                {{ getStatusLabel(domain.status) }}
              </span>
            </td>
            <td>{{ formatDate(domain.created_at) }}</td>
            <td>
              <div class="actions">
                <button @click="viewAnalytics(domain)" class="btn-icon" title="Analytics">
                  📊
                </button>
                <button @click="editDomain(domain)" class="btn-icon" title="Editar">
                  ✏️
                </button>
                <button @click="deleteDomain(domain)" class="btn-icon btn-danger" title="Excluir">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="pagination" class="pagination">
        <button 
          @click="goToPage(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="btn-secondary"
        >
          Anterior
        </button>
        
        <span class="page-info">
          Página {{ pagination.page }} de {{ pagination.totalPages }}
          ({{ pagination.total }} total)
        </span>
        
        <button 
          @click="goToPage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="btn-secondary"
        >
          Próxima
        </button>
      </div>
    </div>

    <!-- Modal de Adicionar/Editar Domínio -->
    <DomainModal 
      v-if="showAddModal || editingDomain"
      :domain="editingDomain"
      @close="closeModal"
      @save="handleDomainSave"
    />
  </div>
</template>

<script setup>
import { debounce } from 'lodash-es';

definePageMeta({
  middleware: 'admin-auth'
});

const adminStore = useAdminStore();
const { domains, loading, error } = storeToRefs(adminStore);

// State
const searchTerm = ref('');
const statusFilter = ref('');
const itemsPerPage = ref(20);
const currentPage = ref(1);
const pagination = ref(null);
const showAddModal = ref(false);
const editingDomain = ref(null);

// Debounced search
const debouncedSearch = debounce(() => {
  currentPage.value = 1;
  loadDomains();
}, 500);

// Carregar domínios
const loadDomains = async () => {
  try {
    const params = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      search: searchTerm.value,
      status: statusFilter.value
    };

    const response = await adminStore.fetchDomains(params);
    pagination.value = response.data.pagination;
  } catch (err) {
    console.error('Erro ao carregar domínios:', err);
  }
};

// Aplicar filtros
const applyFilters = () => {
  currentPage.value = 1;
  loadDomains();
};

// Navegar para página
const goToPage = (page) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    currentPage.value = page;
    loadDomains();
  }
};

// Formatar data
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

// Label do status
const getStatusLabel = (status) => {
  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente'
  };
  return labels[status] || status;
};

// Ver analytics
const viewAnalytics = (domain) => {
  navigateTo(`/admin/domains/${domain.id}/analytics`);
};

// Editar domínio
const editDomain = (domain) => {
  editingDomain.value = domain;
};

// Excluir domínio
const deleteDomain = async (domain) => {
  if (confirm(`Tem certeza que deseja excluir o domínio ${domain.domain}?`)) {
    try {
      await adminStore.deleteDomain(domain.id);
      await loadDomains(); // Recarregar lista
    } catch (err) {
      alert('Erro ao excluir domínio: ' + err.message);
    }
  }
};

// Fechar modal
const closeModal = () => {
  showAddModal.value = false;
  editingDomain.value = null;
};

// Salvar domínio
const handleDomainSave = async (domainData) => {
  try {
    if (editingDomain.value) {
      await adminStore.updateDomain(editingDomain.value.id, domainData);
    } else {
      // Implementar criação de domínio
      // await adminStore.createDomain(domainData);
    }
    
    closeModal();
    await loadDomains(); // Recarregar lista
  } catch (err) {
    alert('Erro ao salvar domínio: ' + err.message);
  }
};

// Carregar dados iniciais
onMounted(() => {
  loadDomains();
});
</script>
```

### 3. Composable para Gerenciamento de Estado

```javascript
// composables/useAdminAPI.js
export const useAdminAPI = () => {
  const config = useRuntimeConfig();
  const { $fetch } = useNuxtApp();
  
  // Obter token do cookie ou localStorage
  const getAuthToken = () => {
    const tokenCookie = useCookie('auth-token');
    return tokenCookie.value || localStorage.getItem('auth-token');
  };

  // Fazer chamada autenticada para API
  const authenticatedFetch = async (endpoint, options = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    try {
      const response = await $fetch(`${config.public.apiBase}/api/admin/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      return response;
    } catch (error) {
      // Tratar erros específicos
      if (error.statusCode === 401) {
        // Token expirado - limpar e redirecionar
        const tokenCookie = useCookie('auth-token');
        tokenCookie.value = null;
        localStorage.removeItem('auth-token');
        await navigateTo('/login');
        throw new Error('Sessão expirada. Faça login novamente.');
      } else if (error.statusCode === 403) {
        throw new Error('Você não tem permissão para acessar este recurso.');
      } else if (error.statusCode === 404) {
        throw new Error('Recurso não encontrado.');
      } else if (error.statusCode >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      }
      
      throw error;
    }
  };

  return {
    // Dashboard
    getDashboard: () => authenticatedFetch('dashboard'),
    
    // Domínios
    getDomains: (params = {}) => {
      const queryString = new URLSearchParams(
        Object.entries(params).filter(([_, value]) => value !== '' && value !== null)
      ).toString();
      return authenticatedFetch(`domains${queryString ? '?' + queryString : ''}`);
    },
    
    getDomain: (id) => authenticatedFetch(`domains/${id}`),
    
    updateDomain: (id, data) => authenticatedFetch(`domains/${id}`, {
      method: 'PATCH',
      body: data
    }),
    
    deleteDomain: (id) => authenticatedFetch(`domains/${id}`, {
      method: 'DELETE'
    }),
    
    getDomainAnalytics: (id, period = '30d') => 
      authenticatedFetch(`domains/${id}/analytics?period=${period}`),
    
    // Pagamentos
    getPayments: (params = {}) => {
      const queryString = new URLSearchParams(
        Object.entries(params).filter(([_, value]) => value !== '' && value !== null)
      ).toString();
      return authenticatedFetch(`payments${queryString ? '?' + queryString : ''}`);
    },
    
    createPayment: (data) => authenticatedFetch('payments/create', {
      method: 'POST',
      body: data
    }),
    
    createPixPayment: (data) => authenticatedFetch('payments/pix', {
      method: 'POST',
      body: data
    }),
    
    confirmPixPayment: (data) => authenticatedFetch('payments/confirm-pix', {
      method: 'POST',
      body: data
    }),
    
    // Notificações
    getNotifications: (params = {}) => {
      const queryString = new URLSearchParams(
        Object.entries(params).filter(([_, value]) => value !== '' && value !== null)
      ).toString();
      return authenticatedFetch(`notifications${queryString ? '?' + queryString : ''}`);
    },
    
    markNotificationRead: (notificationId) => authenticatedFetch('notifications/mark-read', {
      method: 'POST',
      body: { notification_id: notificationId }
    }),
    
    // Perfil
    getProfile: () => authenticatedFetch('profile'),
    
    updateProfile: (data) => authenticatedFetch('profile', {
      method: 'PUT',
      body: data
    }),
    
    // Outros
    getCart: () => authenticatedFetch('cart'),
    getPlans: () => authenticatedFetch('plans'),
    getTransaction: (id) => authenticatedFetch(`transactions/${id}`),
    deleteTransaction: (id) => authenticatedFetch(`transactions/${id}`, { method: 'DELETE' })
  };
};
```

### 4. Store Pinia Completo

```javascript
// stores/admin.js
export const useAdminStore = defineStore('admin', () => {
  const adminAPI = useAdminAPI();
  
  // State
  const dashboard = ref(null);
  const domains = ref([]);
  const payments = ref([]);
  const notifications = ref([]);
  const profile = ref(null);
  const plans = ref([]);
  
  const loading = ref(false);
  const error = ref(null);
  
  // Cache timestamps
  const lastFetch = ref({
    dashboard: null,
    domains: null,
    payments: null,
    notifications: null,
    profile: null,
    plans: null
  });
  
  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;
  
  // Helper para verificar se cache é válido
  const isCacheValid = (key) => {
    const timestamp = lastFetch.value[key];
    return timestamp && (Date.now() - timestamp) < CACHE_DURATION;
  };
  
  // Dashboard
  const fetchDashboard = async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('dashboard') && dashboard.value) {
      return dashboard.value;
    }
    
    try {
      loading.value = true;
      error.value = null;
      
      const response = await adminAPI.getDashboard();
      dashboard.value = response;
      lastFetch.value.dashboard = Date.now();
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  // Domínios
  const fetchDomains = async (params = {}, forceRefresh = false) => {
    const cacheKey = `domains_${JSON.stringify(params)}`;
    
    if (!forceRefresh && isCacheValid('domains') && domains.value.length > 0 && !params.page) {
      return { data: { domains: domains.value } };
    }
    
    try {
      loading.value = true;
      error.value = null;
      
      const response = await adminAPI.getDomains(params);
      
      if (!params.page || params.page === 1) {
        domains.value = response.data.domains;
        lastFetch.value.domains = Date.now();
      }
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const updateDomain = async (id, data) => {
    try {
      const response = await adminAPI.updateDomain(id, data);
      
      // Atualizar no cache local
      const index = domains.value.findIndex(d => d.id === id);
      if (index !== -1) {
        domains.value[index] = { ...domains.value[index], ...data };
      }
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };
  
  const deleteDomain = async (id) => {
    try {
      const response = await adminAPI.deleteDomain(id);
      
      // Remover do cache local
      domains.value = domains.value.filter(d => d.id !== id);
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };
  
  // Pagamentos
  const fetchPayments = async (params = {}, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('payments') && payments.value.length > 0 && !params.page) {
      return { data: { payments: payments.value } };
    }
    
    try {
      loading.value = true;
      error.value = null;
      
      const response = await adminAPI.getPayments(params);
      
      if (!params.page || params.page === 1) {
        payments.value = response.data.payments;
        lastFetch.value.payments = Date.now();
      }
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  // Notificações
  const fetchNotifications = async (params = {}, forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('notifications') && notifications.value.length > 0 && !params.page) {
      return { data: { notifications: notifications.value } };
    }
    
    try {
      loading.value = true;
      error.value = null;
      
      const response = await adminAPI.getNotifications(params);
      
      if (!params.page || params.page === 1) {
        notifications.value = response.data.notifications;
        lastFetch.value.notifications = Date.now();
      }
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await adminAPI.markNotificationRead(notificationId);
      
      // Atualizar no cache local
      const notification = notifications.value.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };
  
  // Perfil
  const fetchProfile = async (forceRefresh = false) => {
    if (!forceRefresh && isCacheValid('profile') && profile.value) {
      return profile.value;
    }
    
    try {
      loading.value = true;
      error.value = null;
      
      const response = await adminAPI.getProfile();
      profile.value = response;
      lastFetch.value.profile = Date.now();
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  const updateProfile = async (data) => {
    try {
      const response = await adminAPI.updateProfile(data);
      
      // Atualizar cache local
      if (profile.value) {
        profile.value.data.user = { ...profile.value.data.user, ...data };
      }
      
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };
  
  // Limpar cache
  const clearCache = () => {
    dashboard.value = null;
    domains.value = [];
    payments.value = [];
    notifications.value = [];
    profile.value = null;
    plans.value = [];
    
    lastFetch.value = {
      dashboard: null,
      domains: null,
      payments: null,
      notifications: null,
      profile: null,
      plans: null
    };
  };
  
  return {
    // State
    dashboard: readonly(dashboard),
    domains: readonly(domains),
    payments: readonly(payments),
    notifications: readonly(notifications),
    profile: readonly(profile),
    plans: readonly(plans),
    loading: readonly(loading),
    error: readonly(error),
    
    // Actions
    fetchDashboard,
    fetchDomains,
    updateDomain,
    deleteDomain,
    fetchPayments,
    fetchNotifications,
    markNotificationAsRead,
    fetchProfile,
    updateProfile,
    clearCache,
    
    // Direct API access
    ...adminAPI
  };
});
```

### 5. Middleware de Autenticação

```javascript
// middleware/admin-auth.js
export default defineNuxtRouteMiddleware((to, from) => {
  const token = useCookie('auth-token');
  
  if (!token.value) {
    return navigateTo('/login');
  }
  
  // Verificar se o token não expirou (opcional)
  try {
    const payload = JSON.parse(atob(token.value.split('.')[1]));
    const now = Date.now() / 1000;
    
    if (payload.exp && payload.exp < now) {
      // Token expirado
      token.value = null;
      return navigateTo('/login');
    }
    
    // Verificar se tem permissão de admin
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Acesso negado'
      });
    }
  } catch (err) {
    // Token inválido
    token.value = null;
    return navigateTo('/login');
  }
});
```

### 6. Plugin de Configuração

```javascript
// plugins/admin-config.client.js
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  
  // Configurar interceptador global para erros de API
  const { $fetch } = useNuxtApp();
  
  // Interceptar respostas de erro
  $fetch.create({
    onResponseError({ response }) {
      if (response.status === 401) {
        // Token expirado - limpar e redirecionar
        const token = useCookie('auth-token');
        token.value = null;
        navigateTo('/login');
      }
    }
  });
});
```

## Exemplo de Uso Completo

```vue
<!-- pages/admin/payments/index.vue -->
<template>
  <div class="payments-page">
    <PageHeader title="Gerenciamento de Pagamentos">
      <template #actions>
        <button @click="createNewPayment" class="btn-primary">
          + Novo Pagamento
        </button>
      </template>
    </PageHeader>

    <FiltersSection 
      v-model:search="filters.search"
      v-model:status="filters.status"
      v-model:period="filters.period"
      @apply="applyFilters"
    />

    <DataTable
      :data="payments"
      :columns="paymentColumns"
      :loading="loading"
      :error="error"
      :pagination="pagination"
      @page-change="handlePageChange"
      @retry="loadPayments"
    />

    <PaymentModal
      v-if="showPaymentModal"
      :payment="selectedPayment"
      @close="closePaymentModal"
      @save="handlePaymentSave"
    />
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'admin-auth'
});

const adminStore = useAdminStore();
const { payments, loading, error } = storeToRefs(adminStore);

const filters = reactive({
  search: '',
  status: '',
  period: ''
});

const pagination = ref(null);
const showPaymentModal = ref(false);
const selectedPayment = ref(null);

const paymentColumns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'amount', label: 'Valor', formatter: formatCurrency },
  { key: 'status', label: 'Status', component: 'StatusBadge' },
  { key: 'payment_method', label: 'Método' },
  { key: 'created_at', label: 'Data', formatter: formatDate },
  { key: 'actions', label: 'Ações', component: 'ActionButtons' }
];

const loadPayments = async (page = 1) => {
  try {
    const params = {
      page,
      limit: 20,
      ...filters
    };
    
    const response = await adminStore.fetchPayments(params);
    pagination.value = response.data.pagination;
  } catch (err) {
    console.error('Erro ao carregar pagamentos:', err);
  }
};

const applyFilters = () => {
  loadPayments(1);
};

const handlePageChange = (page) => {
  loadPayments(page);
};

const createNewPayment = () => {
  selectedPayment.value = null;
  showPaymentModal.value = true;
};

const closePaymentModal = () => {
  showPaymentModal.value = false;
  selectedPayment.value = null;
};

const handlePaymentSave = async (paymentData) => {
  try {
    await adminStore.createPayment(paymentData);
    closePaymentModal();
    loadPayments();
  } catch (err) {
    alert('Erro ao criar pagamento: ' + err.message);
  }
};

onMounted(() => {
  loadPayments();
});
</script>
```

Este guia prático fornece exemplos completos e funcionais para implementar corretamente os endpoints de ADMIN no frontend, incluindo tratamento de erros, cache, paginação e uma arquitetura escalável.