#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Chave secreta (deve ser a mesma usada no backend)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Dados do usuário admin
const payload = {
  userId: 'ab9f7874-c0d9-42f5-b4da-45b6e0793138',
  email: 'alaxricardsilva@outlook.com',
  role: 'ADMIN',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
};

try {
  const token = jwt.sign(payload, JWT_SECRET);
  console.log('🔑 Token gerado com sucesso:');
  console.log(token);
  console.log('\n📋 Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n⏰ Expira em:', new Date(payload.exp * 1000).toLocaleString());
} catch (error) {
  console.error('❌ Erro ao gerar token:', error.message);
}