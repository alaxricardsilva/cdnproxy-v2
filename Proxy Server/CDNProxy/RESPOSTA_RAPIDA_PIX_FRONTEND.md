# ⚡ RESPOSTA RÁPIDA: Dados do Formulário PIX

## ❓ Sua Pergunta

> "No frontend tem os campos para preencher os dados do PIX. Esses dados não irão ser enviados para o backend e o backend fazer a alteração no banco de dados?"

---

## ✅ RESPOSTA DIRETA

**SIM, os dados SERÃO enviados ao backend e salvos no banco, MAS...**

**⚠️ SOMENTE se você IMPLEMENTAR o código JavaScript que faz isso!**

---

## 🚨 O QUE MUITA GENTE PENSA (ERRADO)

```
❌ ERRADO:
"Vou criar um formulário HTML e os dados vão magicamente 
aparecer no banco de dados"
```

**NÃO FUNCIONA ASSIM!**

---

## ✅ COMO REALMENTE FUNCIONA

```
1. Usuário preenche formulário
   ↓
2. Usuário clica no botão
   ↓
3. JavaScript FAZ REQUISIÇÃO HTTP para o backend
   ↓ (SEM ISSO, NADA ACONTECE!)
4. Backend recebe os dados
   ↓
5. Backend salva no banco
   ↓
6. Backend retorna resposta
   ↓
7. Frontend exibe resultado
```

---

## 📝 EXEMPLO PRÁTICO

### ❌ ISSO NÃO FUNCIONA (só o formulário)

```html
<!-- Só isso NÃO envia nada ao backend! -->
<form>
  <input name="dominio" placeholder="Digite o domínio" />
  <input name="valor" placeholder="Digite o valor" />
  <button>Gerar PIX</button>
</form>
```

**Problema:** Falta o código JavaScript que ENVIA os dados!

---

### ✅ ISSO FUNCIONA (formulário + JavaScript)

```vue
<template>
  <form @submit.prevent="enviarDados">
    <input v-model="form.dominio" placeholder="Digite o domínio" />
    <input v-model="form.valor" placeholder="Digite o valor" />
    
    <!-- BOTÃO QUE EXECUTA A FUNÇÃO -->
    <button type="submit">Gerar PIX</button>
  </form>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({
  dominio: '',
  valor: 0
})

// 🚀 ESTA FUNÇÃO FAZ A MÁGICA ACONTECER!
const enviarDados = async () => {
  // ⚡ REQUISIÇÃO HTTP - SEM ISSO, NADA ACONTECE!
  const response = await fetch('https://api.cdnproxy.top/api/admin/payments/pix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    },
    body: JSON.stringify({
      domains: [form.value.dominio],
      amount: form.value.valor,
      plan_id: 'plan-1'
    })
  })

  const resultado = await response.json()
  
  // ✅ Agora sim! Backend recebeu, processou e salvou no banco!
  console.log('QR Code gerado:', resultado.data.qr_code_image)
}
</script>
```

**Por que funciona:**
1. ✅ Tem o formulário
2. ✅ Tem o botão
3. ✅ Tem a função JavaScript `enviarDados()`
4. ✅ Tem a requisição HTTP `fetch()`
5. ✅ Backend recebe os dados
6. ✅ Backend salva no banco
7. ✅ Frontend recebe a resposta

---

## 🎯 O QUE VOCÊ PRECISA FAZER

### Passo 1: Criar o Service

**Arquivo:** `services/pixPayment.js`

```javascript
import api from './api'

export const pixPaymentService = {
  async createPayment(domains, planId, amount) {
    // ⚡ ESTA LINHA FAZ A REQUISIÇÃO HTTP
    const response = await api.post('/api/admin/payments/pix', {
      domains: domains,
      plan_id: planId,
      amount: amount
    })
    
    return response.data.data
  }
}
```

### Passo 2: Usar no Componente

**Arquivo:** `components/FormularioPix.vue`

```vue
<template>
  <div>
    <!-- FORMULÁRIO -->
    <input v-model="domains" placeholder="Domínios" />
    <input v-model="planId" placeholder="Plano" />
    <input v-model.number="amount" type="number" placeholder="Valor" />
    
    <!-- BOTÃO QUE CHAMA A FUNÇÃO -->
    <button @click="gerarPix">Gerar PIX</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { pixPaymentService } from '@/services/pixPayment'

const domains = ref(['domain-1'])
const planId = ref('plan-1')
const amount = ref(35.99)

// FUNÇÃO QUE ENVIA OS DADOS
const gerarPix = async () => {
  try {
    // ⚡ CHAMA O SERVICE QUE FAZ A REQUISIÇÃO HTTP
    const resultado = await pixPaymentService.createPayment(
      domains.value,
      planId.value,
      amount.value
    )
    
    // ✅ Sucesso! Backend salvou no banco e retornou o QR Code
    console.log('QR Code:', resultado.qr_code_image)
    alert('PIX gerado com sucesso!')
    
  } catch (error) {
    alert('Erro ao gerar PIX: ' + error.message)
  }
}
</script>
```

---

## 📊 O QUE ACONTECE POR TRÁS DOS PANOS

### Quando você clica em "Gerar PIX":

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (app.cdnproxy.top)                           │
│  ─────────────────────────────────────────             │
│  1. Usuário preenche: domains, planId, amount          │
│  2. Clica no botão                                     │
│  3. JavaScript executa: gerarPix()                     │
│  4. Service faz: fetch('POST /api/admin/payments/pix')│
│     ↓                                                   │
│     Envia: { domains: [...], plan_id: '...', ...}     │
└─────────────────────────────────────────────────────────┘
                          ↓
                     INTERNET (HTTPS)
                          ↓
┌─────────────────────────────────────────────────────────┐
│  BACKEND (api.cdnproxy.top)                            │
│  ─────────────────────────────────────                 │
│  5. Recebe: { domains, plan_id, amount }               │
│  6. Valida autenticação (token JWT)                    │
│  7. Gera QR Code PIX                                   │
│  8. Salva no Supabase:                                 │
│     ↓                                                   │
│     INSERT INTO transactions (...)                     │
│     VALUES (domains, amount, qr_code, ...)             │
│  9. Retorna: { qr_code_image, pix_code, ... }         │
└─────────────────────────────────────────────────────────┘
                          ↓
                     INTERNET (HTTPS)
                          ↓
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (app.cdnproxy.top)                           │
│  ─────────────────────────────────────                 │
│  10. Recebe resposta do backend                        │
│  11. Exibe QR Code na tela para o usuário              │
│  12. Usuário escaneia e paga                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 RESUMO FINAL

### ✅ O que você PRECISA ter:

1. **Formulário** (input, select, etc.) ← Você já tem
2. **Botão** que executa uma função ← Você já tem
3. **Função JavaScript** que faz requisição HTTP ← **PRECISA CRIAR**
4. **Service** que encapsula a API ← **PRECISA CRIAR**
5. **Backend** que recebe e salva ← **JÁ ESTÁ PRONTO!**

### ❌ O que NÃO funciona:

- Apenas preencher campos sem código JavaScript
- Apenas criar formulário HTML sem botão funcional
- Apenas ter backend sem fazer requisição HTTP do frontend

### ✅ O que FUNCIONA:

- Formulário + Botão + JavaScript + Requisição HTTP → Backend → Banco

---

## 📁 Documentação Completa

Para ver o código completo e funcionando, consulte:

```
/www/wwwroot/CDNProxy/DOCUMENTACAO_FLUXO_PIX_COMPLETO.md
```

Lá tem:
- ✅ Código completo do Service
- ✅ Código completo do Componente Criar PIX
- ✅ Código completo do Componente Visualizar PIX
- ✅ Exemplos de uso
- ✅ Explicação passo a passo

---

**Desenvolvedor:** Qoder AI  
**Data:** 25/10/2025  
**Status:** ✅ **RESPOSTA COMPLETA**
