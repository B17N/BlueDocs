import { webcrypto } from 'crypto';

// Use Node.js crypto.webcrypto for AES-GCM operations
const crypto = typeof window !== 'undefined' ? window.crypto : webcrypto as Crypto;

export interface SharePayload {
  version: string;
  type: string;
  doc: string;  // Base64-encoded encrypted content
  title: string; // Base64-encoded encrypted title
  key: string;  // Hex-encoded encrypted K1
  iv: string;   // Hex-encoded IV
  meta: {
    fileType: string;
    createdAt: string;
  };
}

/**
 * Convert array buffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to array buffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Convert array buffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to array buffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt data with AES-256-GCM
 */
async function encryptAESGCM(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  return await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );
}

/**
 * Decrypt data with AES-256-GCM
 */
async function decryptAESGCM(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: ArrayBuffer
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encryptedData
  );
}

/**
 * Create share payload for a document
 */
export async function createSharePayload(
  content: string,
  title: string,
  fileType: string = 'text/markdown'
): Promise<{ payload: SharePayload; urlKey: string }> {
  // Step 1: Generate 256-bit AES key (32 bytes)
  const fullKey = crypto.getRandomValues(new Uint8Array(32));
  
  // Step 2: Split key into K1 (28 bytes) and K2 (4 bytes)
  const k1 = fullKey.slice(0, 28);
  const k2 = fullKey.slice(28, 32);
  
  // Step 3: Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Step 4: Import full key for encryption
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    fullKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Step 5: Encrypt document content and title
  const encoder = new TextEncoder();
  const encryptedContent = await encryptAESGCM(
    encoder.encode(content).buffer as ArrayBuffer,
    cryptoKey,
    iv.buffer as ArrayBuffer
  );
  
  const encryptedTitle = await encryptAESGCM(
    encoder.encode(title).buffer as ArrayBuffer,
    cryptoKey,
    iv.buffer as ArrayBuffer
  );
  
  // Step 6: Import K2 as key to encrypt K1
  const k2Key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array([...k2, ...new Uint8Array(28)]), // Pad K2 to 32 bytes
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Step 7: Encrypt K1 using K2
  const encryptedK1 = await encryptAESGCM(k1.buffer as ArrayBuffer, k2Key, iv.buffer as ArrayBuffer);
  
  // Step 8: Create payload
  const payload: SharePayload = {
    version: '1.0',
    type: 'shared-doc',
    doc: arrayBufferToBase64(encryptedContent),
    title: arrayBufferToBase64(encryptedTitle),
    key: arrayBufferToHex(encryptedK1),
    iv: arrayBufferToHex(iv.buffer as ArrayBuffer),
    meta: {
      fileType,
      createdAt: new Date().toISOString()
    }
  };
  
  return {
    payload,
    urlKey: arrayBufferToHex(k2.buffer as ArrayBuffer)
  };
}

/**
 * Decrypt share payload
 */
export async function decryptSharePayload(
  payload: SharePayload,
  urlKey: string
): Promise<{ content: string; title: string }> {
  // Step 1: Convert hex strings back to array buffers
  const k2 = hexToArrayBuffer(urlKey);
  const iv = hexToArrayBuffer(payload.iv);
  const encryptedK1 = hexToArrayBuffer(payload.key);
  const encryptedContent = base64ToArrayBuffer(payload.doc);
  const encryptedTitle = base64ToArrayBuffer(payload.title);
  
  // Step 2: Import K2 as key to decrypt K1
  const k2Key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array([...new Uint8Array(k2), ...new Uint8Array(28)]), // Pad K2 to 32 bytes
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Step 3: Decrypt K1 using K2
  const k1 = await decryptAESGCM(encryptedK1, k2Key, iv);
  
  // Step 4: Reconstruct full key
  const fullKey = new Uint8Array(32);
  fullKey.set(new Uint8Array(k1), 0);
  fullKey.set(new Uint8Array(k2), 28);
  
  // Step 5: Import full key for decryption
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    fullKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Step 6: Decrypt content and title
  const decryptedContent = await decryptAESGCM(encryptedContent, cryptoKey, iv);
  const decryptedTitle = await decryptAESGCM(encryptedTitle, cryptoKey, iv);
  
  // Step 7: Convert back to strings
  const decoder = new TextDecoder();
  return {
    content: decoder.decode(decryptedContent),
    title: decoder.decode(decryptedTitle)
  };
}
