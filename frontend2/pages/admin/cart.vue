<template>
  <div>
    <h1>Admin Cart Test</h1>
    
    <label for="token">Auth Token:</label>
    <input type="text" id="token" v-model="token" style="width: 500px; margin-bottom: 10px;">
    <br>
    <button @click="fetchData">Fetch Cart Data</button>
    
    <div v-if="loading" style="margin-top: 10px;">Loading...</div>
    <div v-if="error" style="margin-top: 10px; color: red;">Error: {{ error }}</div>
    
    <div v-if="data" style="margin-top: 10px;">
      <h2>API Response:</h2>
      <pre style="background-color: #f4f4f4; padding: 10px; border: 1px solid #ccc;">{{ data }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const token = ref('');
const data = ref(null);
const loading = ref(false);
const error = ref(null);

async function fetchData() {
  if (!token.value) {
    error.value = 'Please provide an auth token.';
    return;
  }
  
  loading.value = true;
  error.value = null;
  data.value = null;
  
  try {
    const response = await fetch('/api/admin/cart/summary', {
      headers: {
        'Authorization': `Bearer ${token.value}`
      }
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
    }
    
    data.value = JSON.stringify(responseData, null, 2);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
