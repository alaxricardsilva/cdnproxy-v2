#!/bin/bash

BASE_URL="http://localhost:8080"
EMAIL="alaxricardsilva@gmail.com"
PASSWORD="Admin123"

echo "1. Tentando Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

# Extrai o token (bem simplista, assumindo json limpo ou usando grep/sed se jq não tiver, mas vou tentar python one-liner se precisar)
# O backend retorna exatamente o JSON do Supabase.
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Falha no login. Resposta:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Login Sucesso! Token obtido."
# echo "Token: $ACCESS_TOKEN"

echo "2. Testando Rota de Logs (SuperAdmin)..."
LOGS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/superadmin/access-logs" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Resposta da API de Logs:"
echo $LOGS_RESPONSE | head -c 500 # Mostra apenas o começo para não poluir
echo "..."
