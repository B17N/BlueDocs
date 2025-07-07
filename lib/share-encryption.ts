/**
 * Share feature encryption utilities using Web Crypto API
 * AES-256-GCM encryption for shared documents
 */

/**
 * Encrypt partial key using XOR with secret key
 * This is a simple encryption for the partial key stored in NFT
 */
export const encryptPartialKey = (partialKey: string, secretKey: string): string => {
  // Convert hex strings to bytes
  const partialKeyBytes = hexToBytes(partialKey);
  const secretKeyBytes = hexToBytes(secretKey);
  
  // Repeat secret key to match partial key length
  const repeatedSecret = new Uint8Array(partialKeyBytes.length);
  for (let i = 0; i < partialKeyBytes.length; i++) {
    repeatedSecret[i] = secretKeyBytes[i % secretKeyBytes.length];
  }
  
  // XOR encryption
  const encrypted = new Uint8Array(partialKeyBytes.length);
  for (let i = 0; i < partialKeyBytes.length; i++) {
    encrypted[i] = partialKeyBytes[i] ^ repeatedSecret[i];
  }
  
  return bytesToHex(encrypted);
};

/**
 * Decrypt partial key using XOR with secret key
 */
export const decryptPartialKey = (encryptedPartialKey: string, secretKey: string): string => {
  // XOR is its own inverse, so we can use the same function
  return encryptPartialKey(encryptedPartialKey, secretKey);
};

/**
 * Convert hex string to Uint8Array
 */
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

/**
 * Convert Uint8Array to hex string
 */
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Generate a random AES-256 key (32 bytes)
 */
export const generateAESKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
};

/**
 * Export AES key to hex string
 */
export const exportKeyToHex = async (key: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey('raw', key);
  return bytesToHex(new Uint8Array(exported));
};

/**
 * Import AES key from hex string
 */
export const importKeyFromHex = async (keyHex: string): Promise<CryptoKey> => {
  const keyBytes = hexToBytes(keyHex);
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // not extractable for security
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt data using AES-256-GCM
 * Returns encrypted data and IV (12 bytes for GCM)
 */
export const encryptWithAES = async (
  data: string,
  key: CryptoKey
): Promise<{ encrypted: Uint8Array; iv: Uint8Array }> => {
  // Generate random IV (12 bytes = 96 bits for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBytes
  );
  
  return {
    encrypted: new Uint8Array(encrypted),
    iv: iv
  };
};

/**
 * Decrypt data using AES-256-GCM
 */
export const decryptWithAES = async (
  encrypted: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> => {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};

/**
 * Split a 256-bit key (64 hex chars) into front and secret parts
 */
export const splitKey = (fullKeyHex: string): { front: string; secret: string } => {
  if (fullKeyHex.length !== 64) {
    throw new Error('Key must be 64 hex characters (256 bits)');
  }
  
  return {
    front: fullKeyHex.substring(0, 56),  // First 56 hex chars (224 bits)
    secret: fullKeyHex.substring(56)     // Last 8 hex chars (32 bits)
  };
};

/**
 * Combine front and secret parts to reconstruct full key
 */
export const combineKey = (front: string, secret: string): string => {
  return front + secret;
};

/**
 * Generate share URL
 */
export const generateShareUrl = (tokenId: number, secretKey: string): string => {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://app.bluedocs.com';
  
  return `${baseUrl}/view/${tokenId}#key=${secretKey}`;
};

/**
 * Parse share URL to extract tokenId and secret key
 */
export const parseShareUrl = (url: string): { tokenId: number; secretKey: string } | null => {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/view\/(\d+)/);
    const secretKey = urlObj.hash.replace('#key=', '');
    
    if (pathMatch && secretKey) {
      return {
        tokenId: parseInt(pathMatch[1]),
        secretKey: secretKey
      };
    }
  } catch (e) {
    console.error('Failed to parse share URL:', e);
  }
  
  return null;
}; 