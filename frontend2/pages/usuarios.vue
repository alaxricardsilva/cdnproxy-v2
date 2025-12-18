<template>
  <div>
    <h1>Teste de API - Usuários</h1>
    <input v-model="jwt" placeholder="Informe o JWT" style="width: 400px;" />
    <button @click="buscarUsuarios">Buscar Usuários</button>
    <div v-if="erro" style="color: red">{{ erro }}</div>
    <ul v-if="usuarios.length">
      <li v-for="user in usuarios" :key="user.id">
        {{ user.id }} - {{ user.email || user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const jwt = ref('')
const usuarios = ref([])
const erro = ref('')

async function buscarUsuarios() {
  erro.value = ''
  usuarios.value = []
  try {
    const res = await fetch('https://api.cdnproxy.top/superadmin/users', {
      headers: {
        Authorization: `Bearer ${jwt.value}`
      }
    })
    if (!res.ok) {
      erro.value = `Erro: ${res.status} - ${await res.text()}`
      return
    }
    const data = await res.json()
      usuarios.value = data || []
  } catch (e) {
    erro.value = e.message
  }
}
</script>
