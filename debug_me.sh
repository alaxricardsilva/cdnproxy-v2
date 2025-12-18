#!/bin/bash
EMAIL="alaxricardsilva@gmail.com"
PASSWORD="Admin123"
BASE_URL="http://localhost:8080"

echo "1. Login..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth" -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")
TOKEN=$(echo $LOGIN_RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "2. Fetch Me..."
curl -s -X GET "$BASE_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"
