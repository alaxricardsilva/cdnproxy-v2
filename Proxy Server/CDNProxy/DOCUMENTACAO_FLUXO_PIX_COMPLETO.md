# 📘 Documentação Completa: Fluxo de Dados PIX (Frontend → Backend → Banco)

**Data:** 25 de Outubro de 2025  
**Versão:** 1.0  
**Autor:** Alax Ricard

---

## 🎯 Objetivo deste Documento

Este guia explica **EXATAMENTE** como os dados do PIX fluem entre:
- **Frontend** (app.cdnproxy.top) - Interface do usuário
- **Backend** (api.cdnproxy.top) - API REST
- **Banco de Dados** (Supabase) - Armazenamento

---

## ⚠️ RESPOSTA DIRETA À SUA PERGUNTA

### "Os dados preenchidos no frontend serão enviados ao backend e salvos no banco?"

**✅ SIM, MAS somente se você IMPLEMENTAR o código que faz isso!**

O formulário no navegador **POR SI SÓ** não envia nada. Você precisa:

1. **Criar um botão** que ao ser clicado...
2. **Faz uma requisição HTTP** (fetch/axios) para o backend...
3. **O backend recebe** os dados, processa e salva no banco

**Sem o código JavaScript que faz a requisição HTTP, NADA acontece!**

---

## 📊 Visão Geral do Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│  1. USUÁRIO PREENCHE FORMULÁRIO                            │
│     ↓                                                        │
│  2. CLICA NO BOTÃO "Gerar PIX"                             │
│     ↓                                                        │
│  3. JAVASCRIPT FAZ REQUISIÇÃO HTTP (fetch/axios)           │
│     ↓                                                        │
│  4. BACKEND RECEBE OS DADOS                                │
│     ↓                                                        │
│  5. BACKEND GERA QR CODE                                   │
│     ↓                                                        │
│  6. BACKEND SALVA NO BANCO DE DADOS SUPABASE              │
│     ↓                                                        │
│  7. BACKEND RETORNA QR CODE PARA O FRONTEND               │
│     ↓                                                        │
│  8. FRONTEND EXIBE O QR CODE NA TELA                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 FLUXO DETALHADO: CRIAR PIX

### Passo 1: HTML/Vue - Usuário Preenche os Campos

```vue
<template>
  <div class="pix-form">
    <h2>Criar Pagamento PIX</h2>

    <!-- CAMPOS DO FORMULÁRIO -->
    <div>
      <label>Domínios:</label>
      <select v-model="form.domains" multiple>
        <option value="domain-1">exemplo.com.br</option>
        <option value="domain-2">teste.com.br</option>
      </select>
    </div>

    <div>
      <label>Plano:</label>
      <select v-model="form.plan_id">
        <option value="plan-1">Mensal - R$ 35,99</option>
        <option value="plan-2">Trimestral - R$ 89,99</option>
      </select>
    </div>

    <div>
      <label>Valor:</label>
      <input v-model.number="form.amount" type="number" />
    </div>

    <!-- ⚡ BOTÃO QUE FAZ A MÁGICA ACONTECER -->
    <button @click="enviarParaBackend">
      Gerar PIX
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Dados do formulário
const form = ref({
  domains: [],
  plan_id: '',
  amount: 0
})

// 🚀 ESTA FUNÇÃO ENVIA OS DADOS PARA O BACKEND
const enviarParaBackend = async () => {
  console.log('1. Dados do formulário:', form.value)
  
  // ⚡ REQUISIÇÃO HTTP - SEM ISSO, NADA ACONTECE!
  const response = await fetch('https://api.cdnproxy.top/api/admin/payments/pix', {
    method: 'POST',  // ← Método POST para criar
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
    },
    body: JSON.stringify(form.value)  // ← Envia dados do formulário
  })

  const resultado = await response.json()
  console.log('2. Backend retornou:', resultado)
  
  // ✅ Agora você tem o QR Code!
  // resultado.data.qr_code_image
  // resultado.data.pix_code
  // resultado.data.transaction_id
}
</script>
```

### Passo 2: Backend - Recebe, Processa e Salva

```typescript
// backend/server/api/admin/payments/pix.post.ts

export default defineEventHandler(async (event) => {
  console.log('1. Backend recebeu requisição')

  // 📥 RECEBE os dados que o frontend enviou
  const dadosDoFormulario = await readBody(event)
  console.log('2. Dados recebidos:', dadosDoFormulario)
  // {
  //   domains: ['domain-1', 'domain-2'],
  //   plan_id: 'plan-1',
  //   amount: 35.99
  // }

  // 🔐 Valida autenticação
  const { user, supabase } = await requireAdminAuth(event)

  // 🎨 GERA o QR Code PIX
  const qrCode = await generatePixQRCode({
    pixKey: 'admin@cdnproxy.top',
    amount: dadosDoFormulario.amount,
    description: 'Renovação de domínios',
    transactionId: crypto.randomUUID(),
    merchantName: 'CDNProxy',
    merchantCity: 'SAO PAULO'
  })
  console.log('3. QR Code gerado!')

  // 💾 SALVA NO BANCO DE DADOS SUPABASE
  const { data: transacao } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount: dadosDoFormulario.amount,
      currency: 'BRL',
      payment_method: 'pix',
      status: 'pending',
      metadata: {
        plan_id: dadosDoFormulario.plan_id,
        domains: dadosDoFormulario.domains,
        pix_code: qrCode.emvCode,
        qr_code_image: qrCode.qrCodeImage,
        qr_code_base64: qrCode.qrCodeBase64
      }
    })
    .select()
    .single()
  
  console.log('4. Salvo no banco! ID:', transacao.id)

  // 📤 RETORNA para o frontend
  return {
    success: true,
    data: {
      transaction_id: transacao.id,
      pix_code: qrCode.emvCode,
      qr_code_image: qrCode.qrCodeImage,
      qr_code_base64: qrCode.qrCodeBase64
    }
  }
})
```

### Passo 3: Banco de Dados - Dados Salvos

```sql
-- Tabela: transactions no Supabase
-- Registro criado automaticamente:

id: '29a18907-9ef8-4805-be68-bb4c04d52f63'
user_id: 'user-uuid'
amount: 35.99
currency: 'BRL'
payment_method: 'pix'
status: 'pending'
metadata: {
  "plan_id": "plan-1",
  "domains": ["domain-1", "domain-2"],
  "pix_code": "00020101021226400014br.gov.bcb.pix...",
  "qr_code_image": "data:image/png;base64,iVBORw0...",
  "qr_code_base64": "iVBORw0..."
}
created_at: '2025-10-25 20:26:33'
```

---

## 📝 CÓDIGO COMPLETO: Service de Pagamentos

**Arquivo:** `services/pixPayment.js`

```javascript
// services/pixPayment.js
import api from './api'  // axios ou fetch configurado

export const pixPaymentService = {
  /**
   * ✅ CRIAR PIX - Envia dados do formulário
   */
  async createPayment(domainIds, planId, amount) {
    try {
      // ⚡ FAZ REQUISIÇÃO HTTP POST
      const response = await api.post('/api/admin/payments/pix', {
        domains: domainIds,
        plan_id: planId,
        amount: amount
      })

      if (response.data?.success) {
        // ✅ Backend salvou no banco e retornou os dados
        return response.data.data
      }

      throw new Error(response.data?.message || 'Erro ao criar PIX')

    } catch (error) {
      console.error('Erro ao criar PIX:', error)
      throw error
    }
  },

  /**
   * 🆕 LER PIX - Busca dados de um PIX já criado
   */
  async getPixPayment(transactionId) {
    try {
      // ⚡ FAZ REQUISIÇÃO HTTP GET
      const response = await api.get(`/api/admin/payments/pix/${transactionId}`)

      if (response.data?.success) {
        // ✅ Backend buscou no banco e retornou os dados
        return response.data.data
      }

      throw new Error(response.data?.message || 'PIX não encontrado')

    } catch (error) {
      console.error('Erro ao buscar PIX:', error)

      if (error.response?.status === 404) {
        throw new Error('Parece que esse código não existe.')
      }

      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      throw error
    }
  }
}
```

---

## 🎨 CÓDIGO COMPLETO: Componente Criar PIX

**Arquivo:** `components/CreatePixPayment.vue`

```vue
<template>
  <div class="create-pix">
    <!-- FORMULÁRIO -->
    <div v-if="!pixCriado" class="formulario">
      <h2>Criar Pagamento PIX</h2>

      <div class="campo">
        <label>Domínios para renovar:</label>
        <select v-model="dominiosSelecionados" multiple>
          <option value="domain-1">exemplo.com.br</option>
          <option value="domain-2">teste.com.br</option>
        </select>
      </div>

      <div class="campo">
        <label>Plano:</label>
        <select v-model="planoSelecionado">
          <option value="">Selecione...</option>
          <option value="plan-1">Mensal - R$ 35,99</option>
          <option value="plan-2">Trimestral - R$ 89,99</option>
        </select>
      </div>

      <div class="campo">
        <label>Valor Total:</label>
        <input v-model.number="valor" type="number" step="0.01" />
      </div>

      <!-- BOTÃO QUE ENVIA PARA O BACKEND -->
      <button 
        @click="criarPix" 
        :disabled="carregando || !formularioValido"
        class="botao-criar"
      >
        {{ carregando ? 'Gerando PIX...' : 'Gerar PIX' }}
      </button>

      <p v-if="erro" class="erro">{{ erro }}</p>
    </div>

    <!-- QR CODE GERADO -->
    <div v-else class="qrcode-exibir">
      <h2>✅ PIX Gerado com Sucesso!</h2>

      <img 
        :src="dadosPix.qr_code_image" 
        alt="QR Code PIX"
        class="qrcode-imagem"
      />

      <div class="codigo-pix">
        <label>Pix Copia e Cola:</label>
        <input :value="dadosPix.pix_code" readonly />
        <button @click="copiarCodigo">
          {{ copiado ? '✓ Copiado!' : 'Copiar' }}
        </button>
      </div>

      <div class="informacoes">
        <p><strong>ID da Transação:</strong> {{ dadosPix.transaction_id }}</p>
        <p><strong>Valor:</strong> R$ {{ dadosPix.amount }}</p>
        <p><strong>Expira em:</strong> {{ formatarData(dadosPix.expires_at) }}</p>
      </div>

      <button @click="resetarFormulario" class="botao-novo">
        Criar Novo PIX
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { pixPaymentService } from '@/services/pixPayment'

// Estado do formulário
const dominiosSelecionados = ref([])
const planoSelecionado = ref('')
const valor = ref(0)

// Estado do PIX
const pixCriado = ref(false)
const dadosPix = ref(null)

// Controles
const carregando = ref(false)
const erro = ref('')
const copiado = ref(false)

// Validação
const formularioValido = computed(() => {
  return dominiosSelecionados.value.length > 0 && 
         planoSelecionado.value && 
         valor.value > 0
})

/**
 * 🚀 FUNÇÃO PRINCIPAL: Envia dados para o backend
 */
const criarPix = async () => {
  carregando.value = true
  erro.value = ''

  try {
    console.log('📤 Enviando para o backend:', {
      domains: dominiosSelecionados.value,
      plan_id: planoSelecionado.value,
      amount: valor.value
    })

    // ⚡ REQUISIÇÃO HTTP PARA O BACKEND
    dadosPix.value = await pixPaymentService.createPayment(
      dominiosSelecionados.value,
      planoSelecionado.value,
      valor.value
    )

    console.log('✅ Backend retornou:', dadosPix.value)

    // ✅ Sucesso! Mostra o QR Code
    pixCriado.value = true

    // 💾 Salva ID no localStorage (opcional)
    localStorage.setItem('ultimo_pix_id', dadosPix.value.transaction_id)

  } catch (err) {
    erro.value = err.message || 'Erro ao gerar PIX'
    console.error('❌ Erro:', err)
  } finally {
    carregando.value = false
  }
}

const copiarCodigo = async () => {
  try {
    await navigator.clipboard.writeText(dadosPix.value.pix_code)
    copiado.value = true
    setTimeout(() => copiado.value = false, 2000)
  } catch (err) {
    alert('Código copiado!')
  }
}

const resetarFormulario = () => {
  pixCriado.value = false
  dadosPix.value = null
  dominiosSelecionados.value = []
  planoSelecionado.value = ''
  valor.value = 0
}

const formatarData = (isoDate) => {
  return new Date(isoDate).toLocaleString('pt-BR')
}
</script>

<style scoped>
.create-pix {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.campo {
  margin-bottom: 1.5rem;
}

.campo label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.campo select,
.campo input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.botao-criar {
  width: 100%;
  padding: 1rem;
  background: #00aa45;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
}

.botao-criar:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.qrcode-imagem {
  width: 300px;
  height: 300px;
  margin: 2rem auto;
  display: block;
  border: 2px solid #ddd;
  border-radius: 8px;
}

.codigo-pix {
  margin: 1.5rem 0;
}

.codigo-pix input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: monospace;
  margin: 0.5rem 0;
}

.codigo-pix button {
  width: 100%;
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.informacoes {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.erro {
  color: #dc3545;
  background: #f8d7da;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}
</style>
```

---

## 🔎 CÓDIGO COMPLETO: Componente Visualizar PIX

**Arquivo:** `components/ViewPixPayment.vue`

```vue
<template>
  <div class="view-pix">
    <!-- BOTÃO PARA CARREGAR -->
    <button 
      v-if="!pixCarregado"
      @click="carregarPix" 
      :disabled="carregando"
    >
      {{ carregando ? 'Carregando...' : 'Ver QR Code PIX' }}
    </button>

    <!-- QR CODE EXIBIDO -->
    <div v-else class="pix-display">
      <h2>Pagamento PIX</h2>

      <div class="status" :class="`status-${dadosPix.status}`">
        {{ getTextoStatus(dadosPix.status) }}
      </div>

      <!-- Alerta se expirou -->
      <div v-if="dadosPix.is_expired" class="alerta">
        <strong>⚠️ PIX Expirado!</strong>
        <p>Este pagamento expirou. Crie um novo PIX.</p>
      </div>

      <!-- QR Code -->
      <div v-else>
        <img 
          :src="dadosPix.qr_code_image" 
          alt="QR Code PIX"
          class="qr-image"
        />

        <div class="codigo">
          <input :value="dadosPix.pix_code" readonly />
          <button @click="copiar">Copiar</button>
        </div>
      </div>

      <!-- Informações -->
      <div class="info">
        <p><strong>ID:</strong> {{ dadosPix.transaction_id }}</p>
        <p><strong>Valor:</strong> R$ {{ dadosPix.amount }}</p>
        <p><strong>Chave PIX:</strong> {{ dadosPix.pix_key }}</p>
        <p><strong>Criado em:</strong> {{ formatarData(dadosPix.created_at) }}</p>
      </div>

      <button @click="fechar">Fechar</button>

      <p v-if="erro" class="erro">{{ erro }}</p>
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

const emit = defineEmits(['fechar'])

const pixCarregado = ref(false)
const dadosPix = ref(null)
const carregando = ref(false)
const erro = ref('')

/**
 * 🔍 FUNÇÃO PRINCIPAL: Busca dados do backend
 */
const carregarPix = async () => {
  carregando.value = true
  erro.value = ''

  try {
    console.log('📥 Buscando PIX:', props.transactionId)

    // ⚡ REQUISIÇÃO HTTP PARA O BACKEND
    dadosPix.value = await pixPaymentService.getPixPayment(props.transactionId)

    console.log('✅ Backend retornou:', dadosPix.value)

    // ✅ Sucesso!
    pixCarregado.value = true

  } catch (err) {
    erro.value = err.message || 'Erro ao carregar PIX'
    console.error('❌ Erro:', err)
  } finally {
    carregando.value = false
  }
}

const copiar = async () => {
  await navigator.clipboard.writeText(dadosPix.value.pix_code)
  alert('Código copiado!')
}

const fechar = () => {
  pixCarregado.value = false
  dadosPix.value = null
  emit('fechar')
}

const getTextoStatus = (status) => {
  const textos = {
    pending: 'Aguardando Pagamento',
    completed: 'Pago',
    failed: 'Falhou'
  }
  return textos[status] || status
}

const formatarData = (isoDate) => {
  return new Date(isoDate).toLocaleString('pt-BR')
}
</script>

<style scoped>
.view-pix {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.qr-image {
  width: 300px;
  height: 300px;
  margin: 2rem auto;
  display: block;
}

.status {
  padding: 0.75rem;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
}

.status-pending { background: #fff3cd; color: #856404; }
.status-completed { background: #d4edda; color: #155724; }
.status-failed { background: #f8d7da; color: #721c24; }

.alerta {
  background: #fff3cd;
  border: 1px solid #ffc107;
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
}

.codigo {
  margin: 1rem 0;
}

.codigo input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: monospace;
  margin-bottom: 0.5rem;
}

.info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.erro {
  color: #dc3545;
  background: #f8d7da;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}
</style>
```

---

## 📖 EXEMPLO DE USO NA PÁGINA

```vue
<template>
  <div class="pagina-pagamentos">
    <h1>Gerenciar Pagamentos PIX</h1>

    <!-- CRIAR NOVO PIX -->
    <section>
      <h2>Criar Novo PIX</h2>
      <CreatePixPayment />
    </section>

    <!-- VISUALIZAR PIX EXISTENTE -->
    <section>
      <h2>Ver PIX Anterior</h2>
      <ViewPixPayment 
        transaction-id="29a18907-9ef8-4805-be68-bb4c04d52f63" 
        @fechar="handleFechar"
      />
    </section>
  </div>
</template>

<script setup>
import CreatePixPayment from '@/components/CreatePixPayment.vue'
import ViewPixPayment from '@/components/ViewPixPayment.vue'

const handleFechar = () => {
  console.log('Componente fechado')
}
</script>
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### 1. Service (Obrigatório)
- [ ] Criar arquivo `services/pixPayment.js`
- [ ] Adicionar método `createPayment()`
- [ ] Adicionar método `getPixPayment()`
- [ ] Configurar autenticação (Bearer token)

### 2. Componente Criar PIX (Obrigatório)
- [ ] Criar arquivo `components/CreatePixPayment.vue`
- [ ] Adicionar formulário com campos
- [ ] Adicionar botão que chama `createPayment()`
- [ ] Exibir QR Code após criação

### 3. Componente Visualizar PIX (Opcional)
- [ ] Criar arquivo `components/ViewPixPayment.vue`
- [ ] Adicionar botão que chama `getPixPayment()`
- [ ] Exibir QR Code do banco
- [ ] Mostrar alerta se expirou

### 4. Integração nas Páginas
- [ ] Importar componentes nas páginas
- [ ] Testar fluxo completo
- [ ] Validar dados salvos no banco

---

## 🎓 CONCLUSÃO

### ✅ O que você precisa saber:

1. **Formulário sozinho NÃO envia dados** - precisa de código JavaScript
2. **Botão precisa fazer requisição HTTP** - fetch/axios para o backend
3. **Backend processa e salva** - no banco Supabase
4. **Frontend recebe resposta** - e exibe o QR Code

### ⚡ Ação Necessária:

Copie e implemente os códigos acima no seu frontend para que o fluxo funcione!

**Desenvolvedor:** Qoder AI  
**Versão:** 1.0  
**Status:** ✅ **DOCUMENTAÇÃO COMPLETA**
