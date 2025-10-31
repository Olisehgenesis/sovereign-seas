/**
 * Server-side crypto utilities
 * Uses Node.js crypto for decryption and verification
 */
import crypto from 'crypto'

/**
 * Decrypt payload using AES-GCM (Node.js implementation)
 */
export async function decryptPayloadServer(
  encrypted: string,
  iv: string,
  secret: string
): Promise<string> {
  const encryptedBuffer = Buffer.from(encrypted, 'base64')
  const ivBuffer = Buffer.from(iv, 'base64')
  
  // Derive key using PBKDF2
  const key = crypto.pbkdf2Sync(
    secret,
    'sovads-salt-v1',
    100000,
    32,
    'sha256'
  )
  
  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer)
  
  // Extract auth tag (last 16 bytes in GCM mode)
  const authTagLength = 16
  const encryptedData = encryptedBuffer.slice(0, -authTagLength)
  const authTag = encryptedBuffer.slice(-authTagLength)
  
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedData, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Verify HMAC signature (Node.js implementation)
 */
export async function verifySignatureServer(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number
): Promise<boolean> {
  const message = `${timestamp}:${payload}`
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(message)
  const expectedSignature = hmac.digest('base64')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Hash secret for storage (Node.js)
 */
export function hashSecretServer(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

/**
 * Generate API key (Node.js)
 */
export function generateApiKeyServer(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Generate secret (Node.js)
 */
export function generateSecretServer(): string {
  return crypto.randomBytes(32).toString('hex')
}

