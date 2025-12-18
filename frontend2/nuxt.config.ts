// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  modules: ['@nuxtjs/supabase'],
  supabase: {
    url: process.env.NUXT_SUPABASE_URL,
    key: process.env.NUXT_SUPABASE_KEY
  },
  vite: {
    server: {
      allowedHosts: ['app.cdnproxy.top']
    }
  }
})
