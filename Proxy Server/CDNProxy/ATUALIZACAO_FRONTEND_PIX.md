# 🔄 Atualização Necessária no Frontend - Endpoint de Leitura PIX

## 📋 Sumário Executivo

**Data:** 25/10/2025  
**Versão da API:** 1.1.0  
**Impacto:** MÉDIO - Adiciona funcionalidade de leitura de PIX existente

---

## 🎯 O que Mudou?

### ✅ Novo Endpoint Backend (Já Implementado)

**GET** `/api/admin/payments/pix/{transactionId}`

Este endpoint permite **ler os dados de um pagamento PIX existente** usando o ID da transação.

### ❓ Por que foi necessário?

O endpoint anterior só **criava** PIX, mas não permitia **ler** um PIX já criado. Isso causava o erro:

```
"Parece que esse código não existe."
```

Agora é possível:
- ✅ Recuperar QR Code de uma transação existente
- ✅ Verificar status do pagamento
- ✅ Reexibir o código PIX se o usuário perdeu
- ✅ Validar se o PIX expirou (30 minutos)

---

## 🔧 Alterações Necessárias no Frontend

### 1️⃣ Atualizar Service de Pagamentos

**Arquivo:** `services/pixPayment.js` (ou `.ts`)

**Adicionar este método:**

```javascript
/**
 * 🆕 Busca os dados de um pagamento PIX existente
 * @param {string} transactionId - ID da transação (UUID)
 * @returns {Promise<PixPaymentData>}
 */
async getPixPayment(transactionId) {
  try {
    const response = await api.get(`/api/admin/payments/pix/${transactionId}`)
    
    if (response.data?.success) {
      return response.data.data
    }

    throw new Error(response.data?.message || 'Código PIX não encontrado')
  } catch (error) {
    console.error('Erro ao buscar PIX:', error)
    
    // Tratamento de erros específicos
    if (error.response?.status === 404) {
      throw new Error('Parece que esse código não existe.')
    }
    
    if (error.response?.status === 401) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }
    
    throw error
  }
}
```

---

### 2️⃣ Criar Componente de Visualização (Opcional mas Recomendado)

**Arquivo:** `components/ViewPixPayment.vue`

```vue
<template>
  <div class="view-pix-payment">
    <!-- Botão para carregar PIX -->
    <button 
      v-if="!pixData"
      @click="loadPixPayment" 
      :disabled="loading"
      class="btn-primary"
    >
      {{ loading ? 'Carregando PIX...' : 'Ver QR Code' }}
    </button>

    <!-- Modal com dados do PIX -->
    <div v-if="pixData" class="pix-modal">
      <div class="pix-content">
        <!-- Header -->
        <div class="pix-header">
          <h2>Pagamento PIX</h2>
          <span 
            class="status-badge" 
            :class="`status-${pixData.status}`"
          >
            {{ getStatusText(pixData.status) }}
          </span>
        </div>

        <!-- Alerta de Expiração -->
        <div 
          v-if="pixData.is_expired" 
          class="alert alert-warning"
        >
          <strong>⚠️ PIX Expirado!</strong>
          <p>Este pagamento expirou. Gere um novo PIX para pagar.</p>
        </div>

        <!-- QR Code (apenas se não expirou) -->
        <div v-else class="qr-code-section">
          <img 
            :src="pixData.qr_code_image" 
            alt="QR Code PIX"
            class="qr-code-image"
          />
          <p class="qr-instructions">
            Escaneie o QR Code com o app do seu banco
          </p>
        </div>

        <!-- Código Pix Copia e Cola -->
        <div v-if="!pixData.is_expired" class="pix-code-section">
          <label>Pix Copia e Cola:</label>
          <div class="code-container">
            <input 
              type="text" 
              :value="pixData.pix_code" 
              readonly
              ref="codeInput"
              class="pix-code-input"
            />
            <button @click="copyCode" class="btn-copy">
              {{ copied ? '✓ Copiado!' : 'Copiar' }}
            </button>
          </div>
        </div>

        <!-- Informações do Pagamento -->
        <div class="payment-info">
          <div class="info-row">
            <span class="label">ID da Transação:</span>
            <span class="value monospace">{{ pixData.transaction_id }}</span>
          </div>
          <div class="info-row">
            <span class="label">Valor:</span>
            <span class="value">R$ {{ formatMoney(pixData.amount) }}</span>
          </div>
          <div class="info-row">
            <span class="label">Chave PIX:</span>
            <span class="value">{{ pixData.pix_key }}</span>
          </div>
          <div class="info-row">
            <span class="label">Tipo de Chave:</span>
            <span class="value">{{ pixData.pix_key_type }}</span>
          </div>
          <div class="info-row">
            <span class="label">Descrição:</span>
            <span class="value">{{ pixData.description }}</span>
          </div>
          <div class="info-row">
            <span class="label">Criado em:</span>
            <span class="value">{{ formatDate(pixData.created_at) }}</span>
          </div>
          <div class="info-row">
            <span class="label">Expira em:</span>
            <span class="value" :class="{ 'text-danger': pixData.is_expired }">
              {{ formatDate(pixData.expires_at) }}
              {{ pixData.is_expired ? '(Expirado)' : '' }}
            </span>
          </div>
        </div>

        <!-- Domínios Incluídos -->
        <div v-if="pixData.domains?.length" class="domains-list">
          <label>Domínios:</label>
          <ul>
            <li v-for="domain in pixData.domains" :key="domain.id">
              {{ domain.domain }}
            </li>
          </ul>
        </div>

        <!-- Ações -->
        <div class="actions">
          <button @click="closeModal" class="btn-secondary">
            Fechar
          </button>
          <button 
            v-if="!pixData.is_expired && pixData.status === 'pending'"
            @click="refresh"
            class="btn-refresh"
          >
            🔄 Atualizar Status
          </button>
        </div>

        <!-- Erro -->
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { pixPaymentService } from '@/services/pixPayment'

const props = defineProps({
  transactionId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'refresh'])

const loading = ref(false)
const pixData = ref(null)
const error = ref('')
const copied = ref(false)
const codeInput = ref(null)

// Carregar dados do PIX
const loadPixPayment = async () => {
  loading.value = true
  error.value = ''
  
  try {
    pixData.value = await pixPaymentService.getPixPayment(props.transactionId)
  } catch (err) {
    error.value = err.message || 'Erro ao carregar dados do PIX'
    console.error('Erro ao buscar PIX:', err)
  } finally {
    loading.value = false
  }
}

// Copiar código PIX
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(pixData.value.pix_code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    // Fallback
    codeInput.value.select()
    document.execCommand('copy')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

// Atualizar status
const refresh = async () => {
  await loadPixPayment()
  emit('refresh', pixData.value)
}

// Fechar modal
const closeModal = () => {
  pixData.value = null
  error.value = ''
  emit('close')
}

// Helpers
const getStatusText = (status) => {
  const statuses = {
    pending: 'Aguardando Pagamento',
    completed: 'Pago',
    failed: 'Falhou',
    cancelled: 'Cancelado',
    awaiting_confirmation: 'Aguardando Confirmação'
  }
  return statuses[status] || status
}

const formatMoney = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const formatDate = (isoDate) => {
  return new Date(isoDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.pix-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.pix-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.pix-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-completed {
  background: #d4edda;
  color: #155724;
}

.status-failed {
  background: #f8d7da;
  color: #721c24;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.alert-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
}

.qr-code-section {
  text-align: center;
  margin: 1.5rem 0;
}

.qr-code-image {
  width: 256px;
  height: 256px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
}

.pix-code-section {
  margin: 1.5rem 0;
}

.code-container {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.pix-code-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.85rem;
}

.btn-copy {
  padding: 0.75rem 1.5rem;
  background: #00aa45;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.payment-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-weight: 600;
}

.monospace {
  font-family: monospace;
  font-size: 0.85rem;
}

.text-danger {
  color: #dc3545;
}

.domains-list {
  margin: 1rem 0;
}

.domains-list ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.domains-list li {
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.actions button {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-refresh {
  background: #007bff;
  color: white;
}

.error-message {
  color: #dc3545;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8d7da;
  border-radius: 6px;
  text-align: center;
}
</style>
```

---

### 3️⃣ Exemplo de Uso Completo

#### Cenário 1: Visualizar PIX de uma Transação Existente

```vue
<template>
  <div class="payment-history">
    <h2>Histórico de Pagamentos</h2>
    
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Valor</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="transaction in transactions" :key="transaction.id">
          <td>{{ formatDate(transaction.created_at) }}</td>
          <td>R$ {{ transaction.amount }}</td>
          <td>{{ transaction.status }}</td>
          <td>
            <!-- Botão para ver PIX -->
            <button @click="viewPix(transaction.id)">
              Ver QR Code
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Componente de visualização -->
    <ViewPixPayment
      v-if="selectedTransactionId"
      :transaction-id="selectedTransactionId"
      @close="selectedTransactionId = null"
      @refresh="refreshTransaction"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ViewPixPayment from '@/components/ViewPixPayment.vue'

const transactions = ref([
  {
    id: '29a18907-9ef8-4805-be68-bb4c04d52f63',
    created_at: '2025-10-25T20:26:33.281Z',
    amount: 10.00,
    status: 'pending'
  }
])

const selectedTransactionId = ref(null)

const viewPix = (transactionId) => {
  selectedTransactionId.value = transactionId
}

const refreshTransaction = (updatedData) => {
  // Atualizar transação na lista
  const index = transactions.value.findIndex(t => t.id === updatedData.transaction_id)
  if (index !== -1) {
    transactions.value[index].status = updatedData.status
  }
}

const formatDate = (isoDate) => {
  return new Date(isoDate).toLocaleString('pt-BR')
}
</script>
```

#### Cenário 2: Reexibir PIX se Usuário Perdeu a Página

```vue
<template>
  <div class="payment-page">
    <p v-if="lastTransactionId">
      Você já tem um pagamento pendente.
      <button @click="showLastPayment">
        Ver Último PIX
      </button>
    </p>

    <ViewPixPayment
      v-if="showingLastPayment"
      :transaction-id="lastTransactionId"
      @close="showingLastPayment = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ViewPixPayment from '@/components/ViewPixPayment.vue'

const lastTransactionId = ref(null)
const showingLastPayment = ref(false)

onMounted(() => {
  // Recuperar último transaction_id do localStorage
  lastTransactionId.value = localStorage.getItem('last_pix_transaction_id')
})

const showLastPayment = () => {
  showingLastPayment.value = true
}
</script>
```

---

## 🔌 Endpoints - Comparação

### Antes (Apenas Criação)

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/api/admin/payments/pix` | Criar novo PIX |

### Depois (Criação + Leitura) ✅

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/api/admin/payments/pix` | Criar novo PIX |
| **🆕 GET** | **`/api/admin/payments/pix/{id}`** | **Ler PIX existente** |

---

## 📊 Resposta da API de Leitura

### Request

```http
GET /api/admin/payments/pix/29a18907-9ef8-4805-be68-bb4c04d52f63
Authorization: Bearer {token}
x-supabase-token: {token}
```

### Response (Sucesso - 200)

```json
{
  "success": true,
  "data": {
    "transaction_id": "29a18907-9ef8-4805-be68-bb4c04d52f63",
    "status": "pending",
    "amount": 10,
    "currency": "BRL",
    "description": "Renovação de 1 domínio(s) - gf.proxysrv.top",
    "pix_key": "admin@cdnproxy.top",
    "pix_key_type": "EMAIL",
    "pix_code": "00020101021226400014br.gov.bcb.pix0118admin@cdnproxy.top...",
    "qr_code": "00020101021226400014br.gov.bcb.pix0118admin@cdnproxy.top...",
    "qr_code_image": "data:image/png;base64,iVBORw0KGgo...",
    "qr_code_base64": "iVBORw0KGgo...",
    "domains": [
      {
        "id": "4b684d2d-f8ea-47da-a107-e3a3ba289e22",
        "domain": "gf.proxysrv.top"
      }
    ],
    "plan_name": "Básico Updated",
    "created_at": "2025-10-25T20:26:33.281435+00:00",
    "expires_at": "2025-10-25T20:56:33.281Z",
    "is_expired": false
  }
}
```

### Response (Erro - 404)

```json
{
  "success": false,
  "statusCode": 404,
  "statusMessage": "Parece que esse código não existe."
}
```

---

## ✅ Checklist de Implementação

### Backend (Já Feito)
- [x] Criar endpoint `/api/admin/payments/pix/[id].get.ts`
- [x] Validar autenticação
- [x] Extrair dados do metadata
- [x] Calcular expiração
- [x] Testar endpoint localmente
- [ ] Deploy em produção

### Frontend (A Fazer)
- [ ] Adicionar método `getPixPayment` ao service
- [ ] Criar componente `ViewPixPayment.vue`
- [ ] Integrar na página de histórico de transações
- [ ] Adicionar opção "Ver QR Code" para PIX pendentes
- [ ] Implementar lógica de reexibição de PIX
- [ ] Adicionar tratamento de erro para PIX expirado
- [ ] Testar fluxo completo

---

## 🧪 Como Testar

### 1. Testar Service Diretamente

```javascript
import { pixPaymentService } from '@/services/pixPayment'

// Testar leitura de PIX
const testGetPix = async () => {
  try {
    const pixData = await pixPaymentService.getPixPayment(
      '29a18907-9ef8-4805-be68-bb4c04d52f63'
    )
    console.log('✅ PIX encontrado:', pixData)
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

testGetPix()
```

### 2. Testar no Console do Navegador

```javascript
// Abrir DevTools > Console
const token = localStorage.getItem('auth_token')

fetch('https://api.cdnproxy.top/api/admin/payments/pix/29a18907-9ef8-4805-be68-bb4c04d52f63', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-supabase-token': token
  }
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error(err))
```

---

## 🚨 Erros Comuns e Soluções

### Erro: "Token inválido" (401)

**Causa:** Token expirado ou não enviado

**Solução:**
```javascript
// Verificar se token existe
const token = localStorage.getItem('auth_token')
if (!token) {
  // Redirecionar para login
  window.location.href = '/login'
}
```

### Erro: "Parece que esse código não existe" (404)

**Causa:** Transaction ID inválido ou não é PIX

**Solução:**
```javascript
// Validar formato UUID antes de enviar
const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return regex.test(uuid)
}

if (!isValidUUID(transactionId)) {
  throw new Error('ID de transação inválido')
}
```

### Erro: PIX Expirado

**Causa:** Mais de 30 minutos desde a criação

**Solução:**
```javascript
if (pixData.is_expired) {
  alert('Este PIX expirou. Crie um novo pagamento.')
  // Redirecionar para criação de novo PIX
}
```

---

## 📞 Suporte

**Desenvolvedor:** Qoder AI  
**Data:** 25/10/2025  
**Versão:** 1.1.0

---

**Status:** ✅ **Backend pronto | Frontend precisa implementar**
