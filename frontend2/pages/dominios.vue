<template>
  <div>
    <h1>Teste de API - Domínios</h1>
    <input v-model="jwt" placeholder="Informe o JWT" style="width: 400px;" />
    <button @click="buscarDominios">Buscar Domínios</button>
    <div v-if="erro" style="color: red">{{ erro }}</div>
    <ul v-if="dominios.length">
      <li v-for="dominio in dominios" :key="dominio.id">
        {{ dominio.id }} - {{ dominio.name || dominio.domain }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const jwt = ref('')
const dominios = ref([])
const erro = ref('')

async function buscarDominios() {
  erro.value = ''
  dominios.value = []
  try {
    const res = await fetch('https://api.cdnproxy.top/superadmin/domains', {
      headers: {
        Authorization: `Bearer ${jwt.value}`
      }
    })
    if (!res.ok) {
      erro.value = `Erro: ${res.status} - ${await res.text()}`
      return
    }
    dominios.value = await res.json()
  } catch (e) {
    erro.value = e.message
  }
}
</script>
