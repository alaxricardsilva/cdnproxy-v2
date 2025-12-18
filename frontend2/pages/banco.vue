<template>
  <div>
    <h1>Teste de API - Banco de Dados</h1>
    <input v-model="jwt" placeholder="Informe o JWT" style="width: 400px;" />
    <button @click="buscarBanco">Buscar Dados</button>
    <div v-if="erro" style="color: red">{{ erro }}</div>
    <div v-if="dados.length">
      <div v-for="tabela in dados" :key="tabela.name" style="margin-bottom: 20px; border: 1px solid #ccc; padding: 10px;">
        <h3>{{ tabela.name }}</h3>
        <p><strong>Linhas:</strong> {{ tabela.rows }}</p>
        <p><strong>Tamanho:</strong> {{ tabela.size }}</p>
        <strong>Colunas:</strong>
        <ul>
          <li v-for="coluna in tabela.columns" :key="coluna.name">
            {{ coluna.name }} ({{ coluna.type }})
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const jwt = ref('')
const dados = ref([])
const erro = ref('')

async function buscarBanco() {
  erro.value = ''
  dados.value = []
  try {
    const res = await fetch('https://api.cdnproxy.top/superadmin/database', {
      headers: {
        Authorization: `Bearer ${jwt.value}`
      }
    })
    if (!res.ok) {
      erro.value = `Erro: ${res.status} - ${await res.text()}`
      return
    }
    const jsonResponse = await res.json()
    dados.value = jsonResponse.tables
  } catch (e) {
    erro.value = e.message
  }
}
</script>
