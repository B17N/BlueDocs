import * as nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';

export interface EncryptionResult {
  encryptedData: Uint8Array;
  key: string;  // Base64 encoded
  nonce: string;  // Base64 encoded
}

/**
 * 使用 TweetNaCl 加密文本
 * 生成随机的 32 字节密钥和 24 字节 nonce
 * 使用 XSalsa20-Poly1305 算法进行加密
 * 
 * @param text - 要加密的明文
 * @returns 包含加密数据、密钥和 nonce 的对象
 */
export const encryptText = (text: string): EncryptionResult => {
  // 生成随机的 32 字节密钥（AES-256 等级）
  const key = nacl.randomBytes(32);
  // 生成随机的 24 字节 nonce（secretbox 使用）
  const nonceBytes = nacl.randomBytes(24);
  
  // 将文本转换为字节数组
  const messageBytes = decodeUTF8(text);
  
  // 使用 secretbox 加密（XSalsa20-Poly1305）
  const encrypted = nacl.secretbox(messageBytes, nonceBytes, key);
  
  // 将 nonce 和加密数据合并
  const combined = new Uint8Array(nonceBytes.length + encrypted.length);
  combined.set(nonceBytes);
  combined.set(encrypted, nonceBytes.length);
  
  return {
    encryptedData: combined,
    key: encodeBase64(key),
    nonce: encodeBase64(nonceBytes)
  };
};

/**
 * 使用 TweetNaCl 解密数据
 * 
 * @param encryptedData - 包含 nonce 和加密内容的字节数组
 * @param keyB64 - Base64 编码的密钥
 * @param nonceB64 - Base64 编码的 nonce
 * @returns 解密后的明文
 */
export const decryptData = (
  encryptedData: Uint8Array, 
  keyB64: string, 
  nonceB64: string
): string => {
  try {
    // 验证输入参数
    if (!keyB64 || !nonceB64) {
      throw new Error('Key and nonce are required');
    }

    // 清理 Base64 字符串（移除空白字符）
    const cleanKey = keyB64.trim();
    const cleanNonce = nonceB64.trim();

    console.log('Decryption debug info:');
    console.log('Key length:', cleanKey.length);
    console.log('Nonce length:', cleanNonce.length);
    console.log('Encrypted data length:', encryptedData.length);

    let key: Uint8Array, nonce: Uint8Array;
    
    try {
      key = decodeBase64(cleanKey);
      console.log('Decoded key length:', key.length);
    } catch (err) {
      throw new Error('Invalid encryption key format - must be valid Base64');
    }

    try {
      nonce = decodeBase64(cleanNonce);
      console.log('Decoded nonce length:', nonce.length);
    } catch (err) {
      throw new Error('Invalid nonce format - must be valid Base64');
    }

    // 验证密钥和 nonce 的长度
    if (key.length !== 32) {
      throw new Error(`Invalid key size: expected 32 bytes, got ${key.length}`);
    }
    
    if (nonce.length !== 24) {
      throw new Error(`Invalid nonce size: expected 24 bytes, got ${nonce.length}`);
    }

    // 检查数据长度是否足够
    if (encryptedData.length < 24) {
      throw new Error('Encrypted data too short - missing nonce');
    }
    
    // 提取加密内容（跳过前 24 字节的 nonce）
    const encrypted = encryptedData.slice(24);
    console.log('Actual encrypted content length:', encrypted.length);
    
    // 解密
    const decrypted = nacl.secretbox.open(encrypted, nonce, key);
    
    if (!decrypted) {
      throw new Error('Decryption failed - invalid key, nonce, or corrupted data');
    }
    
    return encodeUTF8(decrypted);
  } catch (err) {
    console.error('Detailed decryption error:', err);
    throw new Error(`Decryption error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 验证 Base64 字符串格式
 * 
 * @param str - 要验证的字符串
 * @returns 是否为有效的 Base64 格式
 */
export const isValidBase64 = (str: string): boolean => {
  try {
    const decoded = decodeBase64(str.trim());
    return decoded.length > 0;
  } catch {
    return false;
  }
};

/**
 * 生成随机的加密密钥
 * 
 * @returns Base64 编码的随机密钥
 */
export const generateRandomKey = (): string => {
  const key = nacl.randomBytes(32);
  return encodeBase64(key);
};

/**
 * 生成随机的 nonce
 * 
 * @returns Base64 编码的随机 nonce
 */
export const generateRandomNonce = (): string => {
  const nonce = nacl.randomBytes(24);
  return encodeBase64(nonce);
}; 