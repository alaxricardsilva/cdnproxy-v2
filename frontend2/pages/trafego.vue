<template>
  <div>
    <h1>Teste de API - Tráfego</h1>
    <input v-model="jwt" placeholder="Informe o JWT" style="width: 400px;" />
    <button @click="buscarTrafego">Buscar Tráfego</button>
    <div v-if="erro" style="color: red">{{ erro }}</div>
    <ul v-if="trafego.length">
      <li v-for="item in trafego" :key="item.date">
        {{ item.date }} - {{ item.trafego }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const jwt = ref('')
const trafego = ref([])
const erro = ref('')

async function buscarTrafego() {
  erro.value = ''
  trafego.value = []
  try {
    const res = await fetch('https://api.cdnproxy.top/superadmin/traffic/daily', {
      headers: {
        Authorization: `Bearer ${jwt.value}`
      }
    })
    if (!res.ok) {
      erro.value = `Erro: ${res.status} - ${await res.text()}`
      return
    }
    trafego.value = await res.json()
  } catch (e) {
    erro.value = e.message
  }
}
</script>
