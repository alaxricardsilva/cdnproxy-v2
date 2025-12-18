# Documentação PIX Manual - CDNProxy

## Visão Geral

O PIX Manual é um sistema de pagamento integrado que permite aos usuários gerar QR Codes PIX para pagamentos de planos e renovações de domínios. Esta documentação detalha como configurar e usar o sistema.

## Configuração do Backend

### 1. Estrutura da Tabela `pix_config`

A tabela `pix_config` no Supabase contém as seguintes colunas:

```sql
CREATE TABLE pix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type VARCHAR(20) NOT NULL, -- 'cpf', 'cnpj', 'email', 'phone', 'random'
  key VARCHAR(255) NOT NULL,     -- Chave PIX
  receiver_name VARCHAR(255) NOT NULL, -- Nome do recebedor
  city VARCHAR(100) NOT NULL,    -- Cidade do recebedor
  enabled BOOLEAN DEFAULT true,  -- PIX habilitado por padrão
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. APIs Disponíveis

#### 2.1 Configuração PIX (SUPERADMIN)

**Endpoint:** `POST /api/superadmin/pix-config`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token_superadmin}"
}
```

**Body:**
```json
{
  "key_type": "email",
  "key": "pix@cdnproxy.top",
  "receiver_name": "Alax Ricard",
  "city": "RECIFE",
  "enabled": true
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Configuração PIX atualizada com sucesso",
  "data": {
    "id": "uuid",
    "key_type": "email",
    "key": "pix@cdnproxy.top",
    "receiver_name": "Alax Ricard",
    "city": "RECIFE",
    "enabled": true
  }
}
```

#### 2.2 Buscar Configuração PIX (SUPERADMIN)

**Endpoint:** `GET /api/superadmin/pix-config`

**Headers:**
```json
{
  "Authorization": "Bearer {token_superadmin}"
}
```

#### 2.3 Criar Pagamento PIX (ADMIN)

**Endpoint:** `POST /api/admin/payments/create`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token_admin}",
  "x-supabase-token": "{token_admin}"
}
```

**Body:**
```json
{
  "domain_id": "uuid_do_dominio",
  "plan_id": "uuid_do_plano",
  "payment_method": "pix",
  "amount": 35.99,
  "type": "renewal"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "payment_id": "pix_uuid_timestamp",
    "qr_code": "00020101021226380014br.gov.bcb.pix...",
    "pix_code": "pix_uuid_timestamp",
    "amount": 35.99,
    "status": "pending"
  }
}
```

## Configuração do Frontend

### 1. Domínios e URLs

- **Frontend:** `https://app.cdnproxy.top`
- **Backend API:** `https://api.cdnproxy.top`

### 2. Autenticação

Para usar as APIs, você precisa de tokens válidos:

#### Gerar Token de Administrador:

```javascript
const response = await fetch('https://api.cdnproxy.top/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'alaxricardsilva@outlook.com',
    password: 'Admin123'
  })
});

const { token } = await response.json();
```

### 3. Implementação no Frontend

#### 3.1 Buscar Planos Disponíveis

```javascript
const fetchPlans = async () => {
  const response = await fetch('https://api.cdnproxy.top/api/admin/plans', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
};
```

#### 3.2 Criar Pagamento PIX

```javascript
const createPixPayment = async (domainId, planId, amount) => {
  const response = await fetch('https://api.cdnproxy.top/api/admin/payments/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-supabase-token': token
    },
    body: JSON.stringify({
      domain_id: domainId,
      plan_id: planId,
      payment_method: 'pix',
      amount: amount,
      type: 'renewal'
    })
  });
  
  return await response.json();
};
```

#### 3.3 Gerar QR Code no Frontend

```javascript
// Usando biblioteca QRCode.js
const generateQRCode = (pixCode, elementId) => {
  QRCode.toCanvas(document.getElementById(elementId), pixCode, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
};

// Exemplo de uso
const paymentResult = await createPixPayment(domainId, planId, amount);
if (paymentResult.success) {
  generateQRCode(paymentResult.data.qr_code, 'qr-code-canvas');
}
```

### 4. Tratamento de Erros

#### Erros Comuns:

1. **400 Bad Request:** Campos obrigatórios faltando
2. **401 Unauthorized:** Token inválido ou expirado
3. **403 Forbidden:** Permissões insuficientes
4. **500 Internal Server Error:** PIX não configurado

#### Exemplo de Tratamento:

```javascript
const handlePixPayment = async (domainId, planId, amount) => {
  try {
    const result = await createPixPayment(domainId, planId, amount);
    
    if (result.success) {
      // Sucesso - mostrar QR Code
      generateQRCode(result.data.qr_code, 'qr-code-canvas');
      showPixDetails(result.data);
    } else {
      // Erro da API
      showError(result.message || 'Erro ao criar pagamento PIX');
    }
  } catch (error) {
    // Erro de rede ou parsing
    showError('Erro de conexão. Tente novamente.');
  }
};
```

## Configuração CORS

O backend já está configurado com CORS para aceitar requisições do frontend:

```
Access-Control-Allow-Origin: https://app.cdnproxy.top
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, x-supabase-token
```

## Validações Importantes

### 1. Campos Obrigatórios para Pagamento

- `domain_id`: UUID do domínio
- `plan_id`: UUID do plano
- `payment_method`: Deve ser "pix"
- `amount`: Valor maior que 0

### 2. Configuração PIX

- PIX deve estar habilitado (`enabled: true`)
- Chave PIX deve estar configurada
- Nome do recebedor e cidade são obrigatórios

## Testes

### Script de Teste Completo

Use o script `testar-pix-completo.js` para validar toda a funcionalidade:

```bash
node testar-pix-completo.js
```

### Domínio de Teste

- **Domínio:** `gf.proxysrv.top`
- **ID:** `4b684d2d-f8ea-47da-a107-e3a3ba289e22`

## Troubleshooting

### Problema: Erro 400 "Bad Request"

**Causa:** Campos obrigatórios faltando ou plano com valor R$ 0

**Solução:** Verificar se todos os campos estão presentes e o plano tem valor > 0

### Problema: Erro 401 "Token inválido"

**Causa:** Token expirado ou inválido

**Solução:** Gerar novo token usando `/api/auth/login`

### Problema: PIX não configurado

**Causa:** Tabela `pix_config` vazia ou PIX desabilitado

**Solução:** Configurar PIX via API SUPERADMIN

## Suporte

Para suporte técnico, verifique:

1. Logs do servidor backend
2. Console do navegador (frontend)
3. Status das APIs usando os scripts de teste
4. Configuração do Supabase

---

**Última atualização:** 21/10/2025
**Versão:** 1.0