/**
 * Encryption utilities for sensitive data
 * Uses AES-GCM for encryption/decryption
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256

/**
 * Get the encryption key from environment
 * This should be a 32-byte (256-bit) key stored in base64
 */
function getEncryptionKey(): Uint8Array {
  const keyBase64 = Deno.env.get('ENCRYPTION_KEY')

  if (!keyBase64) {
    throw new Error('ENCRYPTION_KEY not set in environment')
  }

  // Decode from base64
  const binaryString = atob(keyBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}

/**
 * Encrypt a string value
 * Returns base64 encoded encrypted data with IV prepended
 * Format: [IV (12 bytes)][Encrypted Data]
 */
export async function encrypt(plaintext: string): Promise<string> {
  const keyData = getEncryptionKey()

  // Import the key for AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt']
  )

  // Generate a random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt the data
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  )

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Convert to base64
  const binaryString = String.fromCharCode(...combined)
  return btoa(binaryString)
}

/**
 * Decrypt a base64 encoded encrypted string
 * Expects format: [IV (12 bytes)][Encrypted Data]
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const keyData = getEncryptionKey()

  // Import the key for AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  )

  // Decode from base64
  const binaryString = atob(encryptedBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Extract IV (first 12 bytes) and encrypted data
  const iv = bytes.slice(0, 12)
  const encryptedData = bytes.slice(12)

  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedData
  )

  // Convert back to string
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Generate a random encryption key (for initial setup)
 * Returns a base64 encoded 256-bit key
 * This should be run once and stored in ENCRYPTION_KEY env var
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32))
  const binaryString = String.fromCharCode(...key)
  return btoa(binaryString)
}
