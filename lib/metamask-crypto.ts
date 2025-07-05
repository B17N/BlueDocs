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
