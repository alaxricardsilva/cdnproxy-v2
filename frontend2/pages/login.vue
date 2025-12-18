<template>
  <div>
    <h1>Login</h1>
    <form @submit.prevent="handleLogin">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Senha" required />
      <button type="submit">Entrar</button>
    </form>
    <div v-if="error" style="color: red;">{{ error }}</div>
    <div v-if="jwt">
      <h3>Seu JWT Token:</h3>
      <textarea :value="jwt" rows="10" cols="80" readonly></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const error = ref('')
const jwt = ref('')

async function handleLogin() {
  try {
    error.value = ''
    jwt.value = ''
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (signInError) {
      throw signInError
    }

    const session = data.session
    if (session) {
      jwt.value = session.access_token
    } else {
        error.value = 'Login falhou. Nenhuma sessão encontrada.'
    }

  } catch (e) {
    error.value = `Erro no login: ${e.message}`
  }
}
</script>