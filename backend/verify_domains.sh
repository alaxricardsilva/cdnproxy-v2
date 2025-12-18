#!/bin/bash

# Configura dados de teste
DOMAIN_ID=1
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk1MjVhNTEyLWM0MGQtNDA3ZS04ZmZiLTA2NDNmMmYxOTUyZSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3ZwZmR0dGdkZnNodmFibGlpY3liLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4OGU5ZjE1NC1hZTcyLTQwY2ItODc5NC00ZTc2NmMzMTAxYjgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY2MDA2NjUyLCJpYXQiOjE3NjYwMDMwNTIsImVtYWlsIjoiYWxheHJpY2FyZHNpbHZhQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzY2MDAzMDUyfV0sInNlc3Npb25faWQiOiJkNGU3MjRhOS1mNWUzLTQwZTgtYWE2NS00ZDA1NzY1MDBlZjUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.EbhQB9Ot9IpdduVdSYoWxDQSx7tlL7nT_hXNfFvMJI3FuAZ2UXAu4aIDEPk0dyW76FbrW_5uDEvXhT7nhw_7tUurXOsosh6wjBoflcM7GKLQ8OIYdIjCYYiWiaGIKRWudUa1EMlxPBBxotcFvsSxEfr9t9bzDDH2888otPG5CeVoNxcpvWu750Gmr8feu_yUP3UTZFvmiFZNZPIgv8RsLx05p-8bU6IK99o3gRUOlIq0qRYjgq_4551tKhVFCDCXib2qKf_aFUBRtTtJwSMEyuXpDqsnpeEfoh9C_S42a7c1v-KtERdqJRVi-fTgzqqMEIJZir4giuKjbbalM7DjCQ" # User needs to provide this or I verify with existing logic
API_URL="http://localhost:8080/api/superadmin/domains/$DOMAIN_ID"

echo "1. Testing Activate Domain..."
curl -X POST "$API_URL/activate" \
  -H "Authorization: Bearer $TOKEN" \
  -v

echo "\n2. Testing Deactivate Domain..."
curl -X POST "$API_URL/deactivate" \
  -H "Authorization: Bearer $TOKEN" \
  -v

echo "\n3. Testing Renew Domain..."
curl -X POST "$API_URL/renew" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_expiry_date": "2025-12-31T23:59:59Z"}' \
  -v
