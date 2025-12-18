<template>
  <div>
    <h1>Página Inicial Personalizada</h1>
    <h2>Links de Teste</h2>

    <h3>Admin</h3>
    <ul>
      <li><NuxtLink to="/admin/dashboard">Testar Dashboard (Admin)</NuxtLink></li>
      <li><NuxtLink to="/admin/domains">Testar Domínios (Admin)</NuxtLink></li>
      <li><NuxtLink to="/admin/cart">Testar Carrinho (Admin)</NuxtLink></li>
      <li><NuxtLink to="/admin/transactions">Testar Transações (Admin)</NuxtLink></li>
      <li><NuxtLink to="/admin/profile">Testar Perfil (Admin)</NuxtLink></li>
    </ul>

    <h3>Superadmin</h3>
    <ul>
      <li><NuxtLink to="/cloudflare">Testar Cloudflare (Superadmin)</NuxtLink></li>
      <li><NuxtLink to="/logs">Testar Logs (Superadmin)</NuxtLink></li>
      <li><NuxtLink to="/analytics">Testar Analytics (Superadmin)</NuxtLink></li>
      <li><NuxtLink to="/configurations">Testar Configurações (Superadmin)</NuxtLink></li>
      <li><NuxtLink to="/geolocation">Testar Geolocalização (Superadmin)</NuxtLink></li>
      <li><NuxtLink to="/traffic">Testar Tráfego (Superadmin)</NuxtLink></li>
    </ul>

    <h3>Originais / Outros</h3>
    <ul>
      <li><a href="/dominios">Testar Domínios</a></li>
      <li><NuxtLink to="/login">Login (Gerar JWT)</NuxtLink></li>
      <li><NuxtLink to="/usuarios">Teste API - Usuários</NuxtLink></li>
      <li><a href="/trafego">Testar Tráfego</a></li>
      <li><a href="/banco">Testar Banco</a></li>
      <li><a href="/logs">Testar Logs</a></li>
      <li><a href="/analytics">Testar Analytics</a></li>
      <li><a href="/perfil">Testar Perfil</a></li>
      <li><a href="/configuracoes">Testar Configurações</a></li>
      <li><a href="/pagamentos">Testar Pagamentos</a></li>
      <li><a href="/mercadopago">Testar MercadoPago</a></li>
    </ul>
  </div>
</template>
