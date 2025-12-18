# 🔍 Verificação da Estrutura do Banco de Dados para PIX

## Objetivo

Verificar se o banco de dados Supabase possui todos os campos e tabelas necessários para o funcionamento correto da API PIX corrigida.

---

## 1. Estrutura da Tabela `transactions`

### Campos Obrigatórios:

| Campo | Tipo | Descrição | Usado pelo PIX? |
|-------|------|-----------|-----------------|
| `id` | UUID | ID único da transação | ✅ Sim |
| `user_id` | UUID | ID do usuário | ✅ Sim |
| `amount` | NUMERIC/DECIMAL | Valor da transação | ✅ Sim |
| `currency` | VARCHAR | Moeda (BRL) | ✅ Sim |
| `type` | VARCHAR | Tipo (renewal, subscription) | ✅ Sim |
| `status` | VARCHAR | Status (pending, completed, failed) | ✅ Sim |
| `payment_method` | VARCHAR | Método (pix, mercadopago, pagbank) | ✅ Sim |
| `description` | TEXT | Descrição da transação | ✅ Sim |
| **`metadata`** | **JSONB** | **Dados adicionais do PIX** | ✅ **CRÍTICO** |
| `created_at` | TIMESTAMP | Data de criação | ✅ Sim |
| `updated_at` | TIMESTAMP | Data de atualização | ✅ Sim |

### ⚠️ Campo CRÍTICO: `metadata`

O campo `metadata` do tipo **JSONB** é **ESSENCIAL** para armazenar os dados do PIX:

```json
{
  "plan_id": "uuid-do-plano",
  "plan_name": "Nome do Plano",
  "domains": [
    { "id": "uuid", "domain": "exemplo.com" }
  ],
  "pix_key": "admin@cdnproxy.top",
  "pix_amount": 99.90,
  "pix_description": "Renovação de 1 domínio(s)",
  "pix_code": "00020101021226830014br.gov.bcb.pix...",
  "qr_code": "00020101021226830014br.gov.bcb.pix...",
  "qr_code_image": "data:image/png;base64,iVBORw0KGgo...",
  "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "pix_key_type": "EMAIL",
  "duration_value": 30,
  "duration_type": "days"
}
```

---

## 2. Tabela `pix_config` (OPCIONAL)

Esta tabela é opcional mas **RECOMENDADA** para configuração centralizada do PIX:

```sql
CREATE TABLE IF NOT EXISTS pix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type VARCHAR(20) NOT NULL,        -- 'cpf', 'cnpj', 'email', 'phone', 'random'
  key VARCHAR(255) NOT NULL,             -- Chave PIX
  receiver_name VARCHAR(255) NOT NULL,   -- Nome do recebedor
  city VARCHAR(100) NOT NULL,            -- Cidade do recebedor
  enabled BOOLEAN DEFAULT true,          -- PIX habilitado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO pix_config (key_type, key, receiver_name, city, enabled)
VALUES ('email', 'admin@cdnproxy.top', 'CDNProxy', 'SAO PAULO', true);
```

### Uso da Tabela `pix_config`:

- **Se existir**: A API buscará as configurações PIX do banco
- **Se não existir**: A API usará a variável `PIX_KEY` do `.env.production`

---

## 3. Variável de Ambiente `.env.production`

### Configuração Necessária:

```bash
# Chave PIX para pagamentos (usar se não tiver tabela pix_config)
PIX_KEY=admin@cdnproxy.top
```

### Validação da Chave PIX:

A API valida automaticamente os seguintes formatos:

- **EMAIL**: `exemplo@dominio.com` (validação com regex)
- **CPF**: 11 dígitos numéricos
- **CNPJ**: 14 dígitos numéricos
- **TELEFONE**: Inicia com `+55`
- **ALEATÓRIA**: UUID v4

---

## 4. Como a API PIX Usa o Banco de Dados

### Fluxo de Criação de Pagamento PIX:

```javascript
// 1. Criar transação no banco
const transactionData = {
  user_id: user.id,
  amount: 99.90,
  currency: 'BRL',
  type: 'renewal',
  status: 'pending',
  payment_method: 'pix',
  description: 'Renovação de domínios',
  metadata: {
    plan_id: '...',
    plan_name: '...',
    domains: [...]
  }
}

const { data: transaction } = await supabase
  .from('transactions')
  .insert(transactionData)
  .select()
  .single()

// 2. Gerar QR Code PIX
const pixQRCode = await generatePixQRCode({
  pixKey: 'admin@cdnproxy.top',
  amount: 99.90,
  description: 'Renovação de domínios',
  transactionId: transaction.id,
  merchantName: 'CDNProxy',
  merchantCity: 'SAO PAULO'
})

// 3. Atualizar metadata com dados do PIX
await supabase
  .from('transactions')
  .update({
    metadata: {
      ...transactionData.metadata,
      pix_code: pixQRCode.emvCode,
      qr_code: pixQRCode.emvCode,
      qr_code_image: pixQRCode.qrCodeImage,
      qr_code_base64: pixQRCode.qrCodeBase64,
      pix_key_type: pixQRCode.pixKeyType
    }
  })
  .eq('id', transaction.id)
```

---

## 5. Comandos SQL para Verificação

### Verificar se o campo `metadata` existe:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'metadata';
```

**Resultado esperado:**
```
column_name | data_type
------------|----------
metadata    | jsonb
```

### Adicionar campo `metadata` se não existir:

```sql
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
```

### Verificar transações PIX existentes:

```sql
SELECT 
  id,
  amount,
  status,
  payment_method,
  metadata->>'pix_key' as pix_key,
  metadata->>'pix_key_type' as pix_key_type,
  LENGTH(metadata->>'pix_code') as pix_code_length,
  created_at
FROM transactions
WHERE payment_method = 'pix'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 6. Checklist de Verificação

### ✅ Pré-requisitos do Banco:

- [ ] Tabela `transactions` existe
- [ ] Campo `metadata` do tipo JSONB existe
- [ ] Campo `payment_method` aceita valor 'pix'
- [ ] Campo `status` aceita valores: pending, completed, failed, cancelled
- [ ] Campo `currency` aceita valor 'BRL'

### ✅ Configurações Opcionais:

- [ ] Tabela `pix_config` criada (OPCIONAL)
- [ ] Registro padrão em `pix_config` inserido (OPCIONAL)
- [ ] Variável `PIX_KEY` configurada no `.env.production` (OBRIGATÓRIO se não usar pix_config)

### ✅ Validação:

- [ ] Teste de inserção de transação PIX funciona
- [ ] Metadata é salvo corretamente como JSONB
- [ ] Busca de transações PIX retorna resultados
- [ ] Campo `pix_code` no metadata tem ~150-200 caracteres
- [ ] Campo `qr_code_image` no metadata contém base64 PNG

---

## 7. Script de Teste Rápido

Execute este SQL no Supabase SQL Editor para testar:

```sql
-- 1. Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- 2. Testar inserção de transação PIX de teste
INSERT INTO transactions (
  user_id,
  amount,
  currency,
  type,
  status,
  payment_method,
  description,
  metadata
) VALUES (
  'ab9f7874-c0d9-42f5-b4da-45b6e0793138', -- UUID de teste
  99.90,
  'BRL',
  'renewal',
  'pending',
  'pix',
  'Teste de pagamento PIX',
  '{"pix_key": "teste@cdnproxy.top", "pix_key_type": "EMAIL"}'::jsonb
) RETURNING *;

-- 3. Buscar transação de teste
SELECT 
  id,
  payment_method,
  metadata->>'pix_key' as pix_key,
  metadata
FROM transactions
WHERE payment_method = 'pix'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Deletar transação de teste
DELETE FROM transactions
WHERE description = 'Teste de pagamento PIX'
  AND payment_method = 'pix';
```

---

## 8. Solução de Problemas Comuns

### ❌ Erro: "column metadata does not exist"

**Causa**: Campo `metadata` não existe na tabela `transactions`

**Solução**:
```sql
ALTER TABLE transactions 
ADD COLUMN metadata JSONB DEFAULT '{}';
```

### ❌ Erro: "invalid input syntax for type json"

**Causa**: Tentando inserir JSON inválido no campo `metadata`

**Solução**: Verificar se o JSON está correto e usar `::jsonb` para conversão:
```sql
UPDATE transactions
SET metadata = '{"pix_key": "valor"}'::jsonb
WHERE id = 'transaction-uuid';
```

### ❌ Erro: "null value in column metadata violates not-null constraint"

**Causa**: Campo `metadata` foi criado como NOT NULL sem valor padrão

**Solução**:
```sql
ALTER TABLE transactions 
ALTER COLUMN metadata SET DEFAULT '{}';

-- Atualizar registros existentes com metadata NULL
UPDATE transactions
SET metadata = '{}'
WHERE metadata IS NULL;
```

---

## 9. Conclusão

### ✅ **A API PIX funcionará corretamente se:**

1. **Tabela `transactions`** existe
2. **Campo `metadata`** do tipo **JSONB** existe
3. **Variável `PIX_KEY`** está configurada no `.env.production` OU
4. **Tabela `pix_config`** existe com configuração válida

### ⚠️ **Ações Necessárias:**

Se algum dos itens acima não estiver configurado, execute os comandos SQL fornecidos neste documento.

### 📞 **Próximos Passos:**

Após verificar a estrutura do banco:

1. Adicionar `PIX_KEY=sua_chave@exemplo.com` no `.env.production`
2. Reiniciar o container Docker: `docker-compose -f docker-compose.server2.yml restart backend`
3. Testar endpoint: `POST /api/admin/payments/pix`
4. Verificar logs: `docker-compose logs -f backend | grep PIX`

---

**Última atualização**: 2025-10-25
