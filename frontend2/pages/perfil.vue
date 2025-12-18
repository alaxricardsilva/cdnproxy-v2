<template>
  <div>
    <h1>Perfil</h1>
    <textarea v-model="jwt" placeholder="Cole seu JWT aqui"></textarea>
    <button @click="fetchData">Buscar Dados</button>
    <pre v-if="error">{{ error }}</pre>
    <pre v-if="data">{{ data }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const jwt = ref('')
const data = ref(null)
const error = ref(null)

const fetchData = async () => {
  try {
    const response = await fetch('https://api.cdnproxy.top/superadmin/profile', {
      headers: {
        'Authorization': `Bearer ${jwt.value}`
      }
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    data.value = await response.json()
  } catch (e) {
    error.value = e.message
  }
}
</script>
