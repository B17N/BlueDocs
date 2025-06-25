/**
 * MetaMask 加密和解密工具函数
 * 用于使用 MetaMask 钱包的公钥加密数据，以及使用私钥解密数据
 */

export interface EncryptedPayload {
  version: string;
  nonce: string;
  ephemPublicKey: string;
  ciphertext: string;
}

/**
 * 使用 MetaMask 的公钥加密数据
 * 
 * @param data - 要加密的数据（字符串）
 * @param publicKey - MetaMask 提供的加密公钥
 * @returns 加密后的十六进制字符串（以 0x 开头）
 */
export const encryptWithMetaMask = async (
  data: string, 
  publicKey: string
): Promise<string> => {
  if (!publicKey) {
    throw new Error('No public key available');
  }

  try {
    // 动态导入 MetaMask 的加密库
    const { encrypt } = await import('@metamask/eth-sig-util');
    
    const encrypted = encrypt({
      publicKey,
      data,
      version: 'x25519-xsalsa20-poly1305',
    });

    // 转换为十六进制格式以便 MetaMask 兼容
    return '0x' + Buffer.from(JSON.stringify(encrypted)).toString('hex');
  } catch (err) {
    console.error('MetaMask encryption error:', err);
    throw new Error(`Failed to encrypt with MetaMask: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 使用 MetaMask 解密数据
 * 
 * @param encryptedData - 加密的十六进制数据（以 0x 开头）
 * @param walletAddress - 钱包地址
 * @returns 解密后的原始数据
 */
export const decryptWithMetaMask = async (
  encryptedData: string, 
  walletAddress: string
): Promise<string> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not available');
  }

  try {
    console.log('Attempting to decrypt with MetaMask...');
    console.log('Wallet address:', walletAddress);
    console.log('Encrypted data (hex):', encryptedData.substring(0, 100) + '...');
    
    // 记录发送给 eth_decrypt 的确切参数
    console.log('=== eth_decrypt parameters ===');
    console.log('Encrypted data:', encryptedData);
    console.log('Account address:', walletAddress);
    console.log('Parameters array:', [encryptedData, walletAddress]);

    const decrypted = await window.ethereum.request({
      method: 'eth_decrypt',
      params: [encryptedData, walletAddress],
    });
    
    console.log('MetaMask decryption successful:', decrypted);
    return decrypted;
  } catch (err) {
    console.error('Detailed MetaMask decryption error:', err);
    
    // 提供更具体的错误信息
    if (err && typeof err === 'object') {
      const error = err as any;
      if ('code' in error) {
        switch (error.code) {
          case 4001:
            throw new Error('User rejected the decryption request');
          case -32602:
            throw new Error('Invalid parameters for decryption');
          case -32603:
            throw new Error('Internal MetaMask error during decryption');
          default:
            throw new Error(`MetaMask error (code ${error.code}): ${error.message || 'Unknown error'}`);
        }
      } else if ('message' in error) {
        throw new Error(`MetaMask decryption failed: ${error.message}`);
      }
    }
    
    throw new Error(`Failed to decrypt with MetaMask: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 测试 MetaMask 加密/解密功能
 * 
 * @param publicKey - MetaMask 加密公钥
 * @param walletAddress - 钱包地址
 * @returns 测试是否成功
 */
export const testMetaMaskEncryption = async (
  publicKey: string, 
  walletAddress: string
): Promise<boolean> => {
  try {
    const testData = 'Test encryption: ' + Date.now();
    console.log('Testing MetaMask encryption with:', testData);
    
    const encrypted = await encryptWithMetaMask(testData, publicKey);
    console.log('Encryption successful (hex format):', encrypted.substring(0, 100) + '...');
    
    const decrypted = await decryptWithMetaMask(encrypted, walletAddress);
    console.log('Decryption successful:', decrypted);
    
    return decrypted === testData;
  } catch (err) {
    console.error('MetaMask encryption test failed:', err);
    return false;
  }
};

/**
 * 批量加密多个数据项
 * 
 * @param dataArray - 要加密的数据数组
 * @param publicKey - MetaMask 加密公钥
 * @returns 加密后的数据数组
 */
export const encryptMultipleWithMetaMask = async (
  dataArray: string[], 
  publicKey: string
): Promise<string[]> => {
  const encryptedArray: string[] = [];
  
  for (const data of dataArray) {
    const encrypted = await encryptWithMetaMask(data, publicKey);
    encryptedArray.push(encrypted);
  }
  
  return encryptedArray;
};

/**
 * 批量解密多个数据项
 * 
 * @param encryptedArray - 加密的数据数组
 * @param walletAddress - 钱包地址
 * @returns 解密后的数据数组
 */
export const decryptMultipleWithMetaMask = async (
  encryptedArray: string[], 
  walletAddress: string
): Promise<string[]> => {
  const decryptedArray: string[] = [];
  
  for (const encryptedData of encryptedArray) {
    const decrypted = await decryptWithMetaMask(encryptedData, walletAddress);
    decryptedArray.push(decrypted);
  }
  
  return decryptedArray;
};

/**
 * 验证加密数据格式是否正确
 * 
 * @param encryptedData - 要验证的加密数据
 * @returns 是否为有效的加密数据格式
 */
export const isValidEncryptedData = (encryptedData: string): boolean => {
  try {
    if (!encryptedData.startsWith('0x')) {
      return false;
    }
    
    const hexData = encryptedData.slice(2);
    const jsonString = Buffer.from(hexData, 'hex').toString();
    const parsed = JSON.parse(jsonString);
    
    return (
      parsed.version === 'x25519-xsalsa20-poly1305' &&
      typeof parsed.nonce === 'string' &&
      typeof parsed.ephemPublicKey === 'string' &&
      typeof parsed.ciphertext === 'string'
    );
  } catch {
    return false;
  }
}; 