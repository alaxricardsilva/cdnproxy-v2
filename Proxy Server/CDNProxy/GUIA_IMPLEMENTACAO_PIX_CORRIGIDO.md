# 🚀 Guia de Implementação - Correção do PIX

## ✅ O que Foi Corrigido

### 1. Criado Utilitário PIX Completo
**Arquivo:** `backend/utils/pix-generator.ts`

✅ **Implementado:**
- Validação completa de chaves PIX (CPF, CNPJ, Email, Telefone, Aleatória)
- Algoritmo CRC16-CCITT correto (polinômio 0x1021)
- Sanitização de campos (remoção de acentos, limite de tamanho)
- Geração de imagem QR Code em base64
- Formato EMV completo e válido

### 2. APIs Atualizadas

✅ **Arquivos Modificados:**
- `backend/server/api/admin/payments/pix.post.ts`
- `backend/server/api/admin/payments/create.post.ts`

✅ **Melhorias:**
- Validação da chave PIX antes de gerar pagamento
- Geração de QR Code como imagem PNG (base64)
- Retorno completo: código EMV + imagem QR Code
- Logs detalhados do processo

---

## 📦 Passos para Deploy

### Passo 1: Verificar Arquivos

```bash
cd /www/wwwroot/CDNProxy/backend

# Verificar se o utilitário foi criado
ls -lh utils/pix-generator.ts

# Verificar se as APIs foram atualizadas
git diff server/api/admin/payments/pix.post.ts
git diff server/api/admin/payments/create.post.ts
```

### Passo 2: Rebuild do Docker

```bash
cd /www/wwwroot/CDNProxy

# Parar containers
docker-compose down

# Rebuild da imagem do backend
docker-compose build backend

# Iniciar novamente
docker-compose up -d

# Verificar logs
docker-compose logs -f backend
```

### Passo 3: Verificar Health Check

```bash
# Health check básico
curl http://localhost:5001/api/health

# Deve retornar:
# {"status":"healthy","timestamp":"..."}
```

---

## 🧪 Como Testar

### Teste 1: Validação de Chave PIX

Chaves PIX válidas para testar:

```bash
# Email
PIX_KEY=admin@cdnproxy.top

# CPF (11 dígitos)
PIX_KEY=12345678900

# CNPJ (14 dígitos)
PIX_KEY=12345678000190

# Telefone
PIX_KEY=+5511999998888

# Chave Aleatória (UUID)
PIX_KEY=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Teste 2: Gerar Pagamento PIX

```bash
# Obter token de autenticação
TOKEN="seu-token-admin-aqui"

# Criar pagamento PIX
curl -X POST http://localhost:5001/api/admin/payments/pix \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["domain-id-aqui"],
    "plan_id": "plan-id-aqui",
    "amount": 99.90
  }'
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-da-transacao",
    "pix_key": "admin@cdnproxy.top",
    "pix_key_type": "EMAIL",
    "amount": 99.90,
    "description": "Renovação de 1 domínio(s) - example.com",
    "pix_code": "00020126580014br.gov.bcb.pix...",
    "qr_code": "00020126580014br.gov.bcb.pix...",
    "qr_code_image": "data:image/png;base64,iVBORw0KGgo...",
    "qr_code_base64": "iVBORw0KGgo...",
    "domains": [...],
    "expires_at": "2025-10-25T11:00:00Z"
  }
}
```

### Teste 3: Validar QR Code em App Bancário

1. **Copiar o código PIX:**
   - Use o campo `pix_code` da resposta
   - Copie o código completo

2. **Abrir app do banco:**
   - Escolha "Pix" → "Pagar com Pix Copia e Cola"
   - Cole o código copiado
   - Verificar se reconhece:
     - ✅ Valor correto
     - ✅ Nome do recebedor (CDNProxy)
     - ✅ Cidade (SAO PAULO)
     - ✅ Chave PIX

3. **Testar QR Code (imagem):**
   - Use o campo `qr_code_image`
   - Salve como imagem PNG
   - Escaneie com app do banco
   - Deve reconhecer automaticamente

---

## 🔧 Configuração da Chave PIX

### Via Variável de Ambiente

**Arquivo:** `backend/.env.production`

```bash
# Chave PIX (pode ser CPF, CNPJ, Email, Telefone ou Aleatória)
PIX_KEY=admin@cdnproxy.top
```

### Via Banco de Dados (Superadmin)

**Tabela:** `pix_config`

```sql
INSERT INTO pix_config (key, enabled, receiver_name, city, created_at, updated_at)
VALUES (
  'admin@cdnproxy.top',   -- Chave PIX
  true,                    -- Habilitado
  'CDNProxy',              -- Nome do recebedor (máx 25 caracteres)
  'SAO PAULO',             -- Cidade (máx 15 caracteres)
  NOW(),
  NOW()
);
```

---

## 📊 Estrutura da Resposta

### Campos Retornados:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pix_code` | String | Código PIX (copia e cola) - EMV format |
| `qr_code` | String | Mesmo que `pix_code` |
| `qr_code_image` | String | Imagem QR Code em base64 (data:image/png;base64,...) |
| `qr_code_base64` | String | Base64 puro da imagem (sem prefixo) |
| `pix_key` | String | Chave PIX configurada |
| `pix_key_type` | String | Tipo da chave (CPF, CNPJ, EMAIL, PHONE, RANDOM) |
| `amount` | Number | Valor do pagamento |
| `expires_at` | String | Data de expiração (30 minutos) |

### Como Usar no Frontend:

```typescript
// Exibir QR Code como imagem
<img src={response.data.qr_code_image} alt="QR Code PIX" />

// Botão de copiar código
<button onClick={() => navigator.clipboard.writeText(response.data.pix_code)}>
  Copiar código PIX
</button>

// Exibir informações
<p>Chave PIX: {response.data.pix_key} ({response.data.pix_key_type})</p>
<p>Valor: R$ {response.data.amount.toFixed(2)}</p>
<p>Expira em: {new Date(response.data.expires_at).toLocaleString()}</p>
```

---

## 🔍 Logs e Monitoramento

### Logs Importantes:

```bash
# Ver logs do backend
docker-compose logs -f backend | grep PIX

# Logs de sucesso:
✅ [PIX PAYMENT API] Chave PIX validada: { pixKey: '...', type: 'EMAIL' }
✅ [PIX PAYMENT API] QR Code PIX gerado: { emvLength: 157, pixKeyType: 'EMAIL', hasImage: true }
✅ [PIX PAYMENT API] QR Code PIX salvo no metadata

# Logs de erro:
❌ [PIX PAYMENT API] Chave PIX inválida: { pixKey: '...', error: '...' }
❌ [PIX PAYMENT API] Erro ao gerar QR Code: { error: '...' }
```

### Verificar Transação no Banco:

```sql
-- Buscar transação PIX recente
SELECT 
  id,
  amount,
  status,
  payment_method,
  metadata->>'pix_key' as pix_key,
  metadata->>'pix_key_type' as pix_key_type,
  created_at
FROM transactions
WHERE payment_method = 'pix'
ORDER BY created_at DESC
LIMIT 10;

-- Ver código PIX gerado
SELECT 
  id,
  metadata->>'pix_code' as pix_code,
  length(metadata->>'pix_code') as code_length,
  metadata->>'pix_key_type' as key_type
FROM transactions
WHERE payment_method = 'pix'
AND metadata->>'pix_code' IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
```

---

## ⚠️ Problemas Comuns e Soluções

### Problema 1: "Chave PIX inválida"

**Erro:** `Chave PIX inválida configurada: xxx`

**Solução:**
1. Verifique o formato da chave no `.env.production`:
   - CPF: 11 dígitos (apenas números)
   - CNPJ: 14 dígitos (apenas números)
   - Email: formato válido de email
   - Telefone: +55DDNNNNNNNNN
   - Aleatória: UUID formato 8-4-4-4-12

2. Configure uma chave válida:
```bash
# Email (mais comum)
PIX_KEY=admin@cdnproxy.top

# CPF (sem pontos e traços)
PIX_KEY=12345678900
```

3. Reinicie o backend:
```bash
docker-compose restart backend
```

---

### Problema 2: "QR Code não é reconhecido pelo banco"

**Possíveis causas:**

1. **CRC16 incorreto** ✅ CORRIGIDO
2. **Campos com acentos** ✅ CORRIGIDO (sanitização automática)
3. **Tamanhos incorretos** ✅ CORRIGIDO (validação de limite)

**Verificar:**
```bash
# Ver código EMV gerado
docker-compose logs backend | grep "PIX EMV gerado"

# Verificar tamanho do código (deve ser ~150-200 caracteres)
# Verificar se tem CRC no final (últimos 4 caracteres)
```

---

### Problema 3: "Imagem QR Code não aparece"

**Solução:**

1. Verificar resposta da API:
```bash
curl -X POST ... | jq '.data.qr_code_image'

# Deve começar com: data:image/png;base64,iVBORw0KGgo...
```

2. Testar geração manual:
```typescript
// No navegador ou Node.js
const base64Image = response.data.qr_code_image;
const img = new Image();
img.src = base64Image;
document.body.appendChild(img);
```

3. Verificar logs:
```bash
docker-compose logs backend | grep "QR Code PIX gerado"
# Deve mostrar: hasImage: true
```

---

## 📝 Checklist de Validação

Antes de considerar o PIX funcionando, verifique:

- [ ] ✅ Chave PIX configurada e válida
- [ ] ✅ Backend rebuilded com novo código
- [ ] ✅ API retorna `pix_code` com ~150-200 caracteres
- [ ] ✅ API retorna `qr_code_image` com base64
- [ ] ✅ API retorna `pix_key_type` correto
- [ ] ✅ Código PIX reconhecido pelo app bancário (copia e cola)
- [ ] ✅ QR Code reconhecido pelo app bancário (scanner)
- [ ] ✅ Valor, nome e cidade aparecem corretamente no app
- [ ] ✅ Expiração de 30 minutos funciona
- [ ] ✅ Logs mostram sucesso na geração

---

## 🎯 Resultado Esperado

### Antes (❌ Problema):
```
Código PIX: 00020126580014br.gov.bcb.pix...XXXX
Banco: "Código PIX inválido"
CRC16: Incorreto
QR Code: Apenas string EMV
```

### Depois (✅ Corrigido):
```
Código PIX: 00020126580014br.gov.bcb.pix...A1B2
Banco: ✅ Reconhece corretamente
         ✅ Mostra valor R$ 99,90
         ✅ Mostra recebedor "CDNPROXY"
         ✅ Mostra cidade "SAO PAULO"
CRC16: Correto (A1B2)
QR Code: ✅ Imagem PNG base64
         ✅ Scanneável pelo banco
```

---

## 📞 Suporte

Se após seguir este guia o PIX ainda não funcionar:

1. **Colete informações:**
   ```bash
   # Logs completos
   docker-compose logs backend > backend-logs.txt
   
   # Resposta da API
   curl -X POST ... > api-response.json
   
   # Variáveis de ambiente
   docker-compose exec backend env | grep PIX
   ```

2. **Verifique:**
   - Chave PIX é válida?
   - Backend foi rebuilded?
   - App bancário está atualizado?
   - Código PIX tem ~150-200 caracteres?
   - CRC16 está nos últimos 4 caracteres?

3. **Teste manual:**
   - Copie o código PIX
   - Cole em https://pix.nascent.com.br/tools/pix-qrcode-decoder/
   - Verifique se todos os campos aparecem corretamente

---

**Data:** 25/10/2025  
**Versão:** 1.0.0 (Correção PIX)  
**Status:** ✅ Implementado | ⏳ Aguardando Deploy
