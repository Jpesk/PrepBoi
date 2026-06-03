/**
 * Zero-Knowledge Client-Side Cryptography Module (AES-GCM 256)
 * Encrypts and decrypts manager logs locally using a custom organization passphrase.
 * The server only stores ciphertext.
 */

// Convert a string to an ArrayBuffer
function stringToArrayBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// Convert an ArrayBuffer to a string
function arrayBufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf)
}

// Convert Uint8Array to Base64 string
function bufferToBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
}

// Convert Base64 string to Uint8Array
function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Derive a 256-bit AES-GCM crypto key from a passphrase and salt
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt plain text using a passphrase.
 * Returns a base64-encoded string packing: [salt (16 bytes)][iv (12 bytes)][ciphertext]
 */
export async function encryptText(plainText: string, passphrase: string): Promise<string> {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(passphrase, salt)
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      stringToArrayBuffer(plainText) as any
    )
    
    // Combine salt + iv + encrypted bytes
    const encryptedBytes = new Uint8Array(encrypted)
    const packed = new Uint8Array(salt.length + iv.length + encryptedBytes.length)
    packed.set(salt, 0)
    packed.set(iv, salt.length)
    packed.set(encryptedBytes, salt.length + iv.length)
    
    return bufferToBase64(packed)
  } catch (err) {
    console.error('Encryption failed:', err)
    throw new Error('Could not encrypt content. Verify cryptography environment.')
  }
}

/**
 * Decrypt a base64 packed ciphertext string using the passphrase.
 */
export async function decryptText(packedB64: string, passphrase: string): Promise<string> {
  try {
    const packed = base64ToBuffer(packedB64)
    
    // Extract salt, iv, and ciphertext
    const salt = packed.slice(0, 16)
    const iv = packed.slice(16, 28)
    const ciphertext = packed.slice(28)
    
    const key = await deriveKey(passphrase, salt)
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext as any
    )
    
    return arrayBufferToString(decrypted)
  } catch (err) {
    console.error('Decryption failed (likely invalid keyphrase):', err)
    throw new Error('Decryption failed. The keyphrase may be incorrect.')
  }
}

/**
 * Perform double hashing of a keyphrase to create a verification string
 * that the server can check for matching keyphrases without knowing the actual key.
 */
export async function hashKeyphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(passphrase)
  
  // First hash
  const hash1 = await window.crypto.subtle.digest('SHA-256', data)
  
  // Second hash (stored on server to verify locally entered keys)
  const hash2 = await window.crypto.subtle.digest('SHA-256', hash1)
  
  return bufferToBase64(new Uint8Array(hash2))
}
