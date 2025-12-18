import { logger } from '~/utils/logger'
import jwt from 'jsonwebtoken'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key'
    const payload = jwt.verify(token, secret) as JWTPayload
    return payload
  } catch (error) {
    logger.error('JWT verification failed:', error)
    return null
  }
}

export function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key'
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}