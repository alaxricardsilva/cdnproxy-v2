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
 * Calcula CRC16-CCITT correto usando polinômio 0x1021
 */
function calculateCRC16(data: string): string {
  const polynomial = 0x1021
  let crc = 0xFFFF

  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8)
    
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }

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
  
  // 01: Point of Initiation Method (12 = QR Code dinâmico com valor)
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
    pixKey: 'pix@cdnproxy.top',
    amount: 10.00,
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
