# 🔍 Análise Completa do Problema PIX

## 📋 Resumo do Problema

O código PIX gerado não está sendo reconhecido pelos bancos porque:

1. ❌ **CRC16 incorreto** - Implementação simplificada não gera CRC válido
2. ❌ **Formato EMV incompleto** - Faltam campos obrigatórios
3. ❌ **Validação de dados** - Não valida tamanho máximo de campos
4. ❌ **QR Code não gerado** - Apenas retorna string EMV, sem imagem

---

## 🔧 Problemas Identificados

### 1. Algoritmo CRC16 Incorreto

**Arquivo:** `backend/server/api/admin/payments/pix.post.ts` (linha 224-237)  
**Arquivo:** `backend/server/api/admin/payments/create.post.ts` (linha 305-318)

**Problema:**
```typescript
function calculateCRC16(data: string): string {
  let crc = 0xFFFF
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021  // ❌ Errado
      } else {
        crc = crc << 1
      }
    }
  }
  
  crc = crc & 0xFFFF
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
```

**Por que está errado:**
- O algoritmo **CRC16-CCITT** usado pelo PIX é diferente
- A operação de XOR está incorreta
- Não está aplicando o polinômio correto

**Solução:**
Usar biblioteca `crc` do npm que implementa corretamente o CRC16-CCITT.

---

### 2. Formato EMV Incompleto

**Arquivo:** `backend/server/api/admin/payments/pix.post.ts` (linha 166-223)

**Problemas:**
```typescript
// ❌ Falta validação de tamanho
const pixKeyData = `0014br.gov.bcb.pix01${pixKey.length.toString().padStart(2, '0')}${pixKey}`

// ❌ Não valida se merchantName tem no máximo 25 caracteres
emvData += `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`

// ❌ Não valida se merchantCity tem no máximo 15 caracteres
emvData += `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`

// ❌ TransactionID pode ter no máximo 25 caracteres
const additionalData = `05${txId.length.toString().padStart(2, '0')}${txId}`
```

**Limitações do Padrão EMV PIX:**
- Merchant Name: máximo 25 caracteres
- Merchant City: máximo 15 caracteres
- Transaction ID: máximo 25 caracteres
- Chave PIX: vários formatos (CPF, CNPJ, Email, Telefone, Aleatória)

---

### 3. Falta de Geração de Imagem QR Code

**Problema:**
O código atual apenas retorna a string EMV:
```typescript
return {
  qr_code: emvCode,  // ❌ Apenas string, não imagem
  pix_code: emvCode
}
```

**O que os bancos esperam:**
- Uma **imagem PNG** do QR Code (base64 ou URL)
- A **string EMV** para copiar e colar

**Solução:**
Usar biblioteca `qrcode` (já instalada no projeto) para gerar imagem.

---

### 4. Validação da Chave PIX

**Problema:**
Não há validação do formato da chave PIX:

```typescript
const pixKey = process.env.PIX_KEY || 'admin@cdnproxy.top'
```

**Formatos válidos de chave PIX:**
- **CPF**: 11 dígitos (apenas números)
- **CNPJ**: 14 dígitos (apenas números)
- **Email**: formato email válido
- **Telefone**: +55DDNNNNNNNNN (com código do país)
- **Aleatória**: UUID no formato 8-4-4-4-12

---

## ✅ Soluções Propostas

### Solução 1: Implementar CRC16 Correto

**Instalar biblioteca:**
```bash
npm install crc --save
```

**Código correto:**
```typescript
import { crc16ccitt } from 'crc'

function calculateCRC16(data: string): string {
  const buffer = Buffer.from(data, 'utf8')
  const crc = crc16ccitt(buffer)
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
```

---

### Solução 2: Validar e Truncar Campos

```typescript
function sanitizeField(value: string, maxLength: number): string {
  return value
    .normalize('NFD')                    // Normalizar acentos
    .replace(/[\u0300-\u036f]/g, '')    // Remover acentos
    .substring(0, maxLength)             // Truncar
    .toUpperCase()                       // Maiúsculas
}

// Uso
const merchantName = sanitizeField(name, 25)
const merchantCity = sanitizeField(city, 15)
const txId = sanitizeField(transactionId, 25)
```

---

### Solução 3: Gerar Imagem QR Code

```typescript
import * as QRCode from 'qrcode'

async function generatePixQRCodeComplete(
  pixKey: string,
  amount: number,
  description: string,
  txId: string,
  merchantName: string,
  merchantCity: string
): Promise<{ emvCode: string; qrCodeImage: string }> {
  // Gerar código EMV
  const emvCode = generatePixEMV(pixKey, amount, description, txId, merchantName, merchantCity)
  
  // Gerar imagem QR Code (base64)
  const qrCodeImage = await QRCode.toDataURL(emvCode, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 512,
    margin: 1
  })
  
  return {
    emvCode,
    qrCodeImage
  }
}
```

---

### Solução 4: Validar Chave PIX

```typescript
function validatePixKey(pixKey: string): { valid: boolean; type: string } {
  // CPF (11 dígitos)
  if (/^\d{11}$/.test(pixKey)) {
    return { valid: true, type: 'CPF' }
  }
  
  // CNPJ (14 dígitos)
  if (/^\d{14}$/.test(pixKey)) {
    return { valid: true, type: 'CNPJ' }
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey)) {
    return { valid: true, type: 'EMAIL' }
  }
  
  // Telefone (+55DDNNNNNNNNN)
  if (/^\+55\d{10,11}$/.test(pixKey)) {
    return { valid: true, type: 'PHONE' }
  }
  
  // Chave Aleatória (UUID)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pixKey)) {
    return { valid: true, type: 'RANDOM' }
  }
  
  return { valid: false, type: 'UNKNOWN' }
}
```

---

## 🔨 Implementação das Correções

### Passo 1: Instalar Dependências

```bash
cd /www/wwwroot/CDNProxy/backend
npm install crc --save
```

### Passo 2: Criar Utilitário PIX Completo

**Arquivo:** `backend/utils/pix-generator.ts`

```typescript
import { crc16ccitt } from 'crc'
import * as QRCode from 'qrcode'
import { logger } from './logger'

export interface PixData {
  pixKey: string
  amount: number
  description: string
  transactionId: string
  merchantName: string
  merchantCity: string
}

export interface PixQRCodeResult {
  emvCode: string
  qrCodeImage: string
  qrCodeBase64: string
  pixKeyType: string
  isValid: boolean
}

/**
 * Valida chave PIX
 */
export function validatePixKey(pixKey: string): { valid: boolean; type: string } {
  // CPF (11 dígitos)
  if (/^\d{11}$/.test(pixKey)) {
    return { valid: true, type: 'CPF' }
  }
  
  // CNPJ (14 dígitos)
  if (/^\d{14}$/.test(pixKey)) {
    return { valid: true, type: 'CNPJ' }
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey)) {
    return { valid: true, type: 'EMAIL' }
  }
  
  // Telefone (+55DDNNNNNNNNN)
  if (/^\+55\d{10,11}$/.test(pixKey)) {
    return { valid: true, type: 'PHONE' }
  }
  
  // Chave Aleatória (UUID)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pixKey)) {
    return { valid: true, type: 'RANDOM' }
  }
  
  return { valid: false, type: 'UNKNOWN' }
}

/**
 * Sanitiza campo removendo acentos e limitando tamanho
 */
function sanitizeField(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, maxLength)
    .toUpperCase()
}

/**
 * Calcula CRC16-CCITT correto
 */
function calculateCRC16(data: string): string {
  const buffer = Buffer.from(data, 'utf8')
  const crc = crc16ccitt(buffer)
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Adiciona campo EMV com ID + tamanho + valor
 */
function addEMVField(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`
}

/**
 * Gera código EMV do PIX
 */
export function generatePixEMV(pixData: PixData): string {
  const { pixKey, amount, merchantName, merchantCity, transactionId } = pixData
  
  // Validar chave PIX
  const keyValidation = validatePixKey(pixKey)
  if (!keyValidation.valid) {
    throw new Error(`Chave PIX inválida: ${pixKey}`)
  }
  
  // Sanitizar campos
  const safeMerchantName = sanitizeField(merchantName, 25)
  const safeMerchantCity = sanitizeField(merchantCity, 15)
  const safeTxId = sanitizeField(transactionId, 25)
  
  // Iniciar construção do EMV
  let emv = ''
  
  // 00: Payload Format Indicator
  emv += addEMVField('00', '01')
  
  // 01: Point of Initiation Method (12 = QR Code estático com valor)
  emv += addEMVField('01', '12')
  
  // 26: Merchant Account Information
  let merchantInfo = addEMVField('00', 'br.gov.bcb.pix')
  merchantInfo += addEMVField('01', pixKey)
  emv += addEMVField('26', merchantInfo)
  
  // 52: Merchant Category Code
  emv += addEMVField('52', '0000')
  
  // 53: Transaction Currency (986 = BRL)
  emv += addEMVField('53', '986')
  
  // 54: Transaction Amount
  const amountStr = amount.toFixed(2)
  emv += addEMVField('54', amountStr)
  
  // 58: Country Code
  emv += addEMVField('58', 'BR')
  
  // 59: Merchant Name
  emv += addEMVField('59', safeMerchantName)
  
  // 60: Merchant City
  emv += addEMVField('60', safeMerchantCity)
  
  // 62: Additional Data Field Template
  let additionalData = addEMVField('05', safeTxId)
  emv += addEMVField('62', additionalData)
  
  // 63: CRC16 (placeholder)
  emv += '6304'
  
  // Calcular e adicionar CRC16
  const crc = calculateCRC16(emv)
  emv += crc
  
  logger.info('PIX EMV gerado:', {
    pixKey,
    amount,
    merchantName: safeMerchantName,
    merchantCity: safeMerchantCity,
    txId: safeTxId,
    emvLength: emv.length,
    crc
  })
  
  return emv
}

/**
 * Gera QR Code completo do PIX
 */
export async function generatePixQRCode(pixData: PixData): Promise<PixQRCodeResult> {
  try {
    // Validar chave PIX
    const keyValidation = validatePixKey(pixData.pixKey)
    
    if (!keyValidation.valid) {
      throw new Error(`Chave PIX inválida: ${pixData.pixKey}`)
    }
    
    // Gerar código EMV
    const emvCode = generatePixEMV(pixData)
    
    // Gerar imagem QR Code
    const qrCodeImage = await QRCode.toDataURL(emvCode, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 512,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    
    // Extrair apenas o base64 (sem o prefixo data:image/png;base64,)
    const qrCodeBase64 = qrCodeImage.replace(/^data:image\/png;base64,/, '')
    
    logger.info('PIX QR Code gerado com sucesso', {
      pixKey: pixData.pixKey,
      pixKeyType: keyValidation.type,
      emvLength: emvCode.length,
      qrCodeSize: qrCodeBase64.length
    })
    
    return {
      emvCode,
      qrCodeImage,
      qrCodeBase64,
      pixKeyType: keyValidation.type,
      isValid: true
    }
    
  } catch (error) {
    logger.error('Erro ao gerar PIX QR Code:', error)
    throw error
  }
}

/**
 * Teste rápido da geração de PIX
 */
export async function testPixGeneration() {
  const testData: PixData = {
    pixKey: 'admin@cdnproxy.top',
    amount: 99.90,
    description: 'Teste de pagamento',
    transactionId: 'test_123456',
    merchantName: 'CDNProxy',
    merchantCity: 'SAO PAULO'
  }
  
  try {
    const result = await generatePixQRCode(testData)
    logger.info('Teste PIX bem-sucedido:', {
      emvLength: result.emvCode.length,
      pixKeyType: result.pixKeyType,
      hasQRCode: !!result.qrCodeImage
    })
    return result
  } catch (error) {
    logger.error('Teste PIX falhou:', error)
    throw error
  }
}
```

---

## 📝 Resumo das Mudanças Necessárias

### Arquivos a Modificar:

1. ✅ **Criar:** `backend/utils/pix-generator.ts` (novo arquivo)
2. ✅ **Modificar:** `backend/server/api/admin/payments/pix.post.ts`
3. ✅ **Modificar:** `backend/server/api/admin/payments/create.post.ts`
4. ✅ **Modificar:** `backend/package.json` (adicionar dependência `crc`)

### Dependências:

```bash
npm install crc --save
```

### Comandos para testar:

```bash
# Rebuild do Docker
cd /www/wwwroot/CDNProxy/backend
docker-compose build backend
docker-compose up -d backend

# Testar endpoint
curl -X POST http://localhost:5001/api/admin/payments/pix \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domains": ["domain-id"],
    "plan_id": "plan-id",
    "amount": 99.90
  }'
```

---

## 🎯 Próximos Passos

1. ✅ Instalar dependência `crc`
2. ✅ Criar arquivo `backend/utils/pix-generator.ts`
3. ✅ Atualizar APIs de pagamento para usar novo utilitário
4. ✅ Testar geração de QR Code
5. ✅ Validar código PIX em aplicativo bancário
6. ✅ Documentar processo de configuração

---

**Data:** 25/10/2025  
**Versão do Backend:** 1.2.2  
**Problema:** Código PIX não reconhecido pelos bancos  
**Status:** ✅ Análise Completa | ⏳ Aguardando Implementação
