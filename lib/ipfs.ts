/**
 * IPFS 相关工具函数
 * 通过 Pinata API 进行 IPFS 文件上传和下载操作
 */

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
  isDuplicate?: boolean;
}

export interface IPFSUploadOptions {
  fileName?: string;
  fileType?: string;
  metadata?: Record<string, any>;
}

/**
 * 上传加密数据到 IPFS（通过 Pinata）
 * 
 * @param encryptedData - 要上传的加密数据（Uint8Array）
 * @param options - 上传选项
 * @returns Pinata 响应，包含 IPFS 哈希
 */
export const uploadToIPFS = async (
  encryptedData: Uint8Array,
  options: IPFSUploadOptions = {}
): Promise<PinataUploadResponse> => {
  const {
    fileName = 'encrypted.bin',
    fileType = 'application/octet-stream',
    metadata = {}
  } = options;

  // 获取 Pinata JWT 从环境变量
  const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT;

  if (!pinataJWT) {
    throw new Error('Pinata JWT not configured. Please set NEXT_PUBLIC_PINATA_JWT environment variable.');
  }

  try {
    // 创建 FormData 对象
    const formData = new FormData();
    const blob = new Blob([encryptedData], { type: fileType });
    formData.append('file', blob, fileName);

    // 添加元数据（如果有）
    if (Object.keys(metadata).length > 0) {
      formData.append('pinataMetadata', JSON.stringify({
        name: fileName,
        keyvalues: metadata
      }));
    }

    // 上传到 IPFS via Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJWT}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }

    const data = await response.json();
    console.log('Pinata upload successful:', data);
    
    return data;
  } catch (err) {
    console.error('IPFS upload error:', err);
    throw new Error(`Failed to upload to IPFS: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 从 IPFS 下载数据
 * 
 * @param ipfsHash - IPFS 文件哈希
 * @param gateway - IPFS 网关 URL（可选）
 * @returns 文件的字节数据
 */
export const downloadFromIPFS = async (
  ipfsHash: string,
  gateway: string = 'https://gateway.pinata.cloud/ipfs'
): Promise<Uint8Array> => {
  if (!ipfsHash) {
    throw new Error('IPFS hash is required');
  }

  try {
    const url = `${gateway}/${ipfsHash}`;
    console.log('Downloading from IPFS:', url);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.error('IPFS download error:', err);
    throw new Error(`Failed to download from IPFS: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 上传文本内容到 IPFS
 * 
 * @param text - 要上传的文本内容
 * @param options - 上传选项
 * @returns Pinata 响应，包含 IPFS 哈希
 */
export const uploadTextToIPFS = async (
  text: string,
  options: IPFSUploadOptions = {}
): Promise<PinataUploadResponse> => {
  const encoder = new TextEncoder();
  const textData = encoder.encode(text);
  
  return uploadToIPFS(textData, {
    fileName: 'document.txt',
    fileType: 'text/plain',
    ...options
  });
};

/**
 * 从 IPFS 下载文本内容
 * 
 * @param ipfsHash - IPFS 文件哈希
 * @param gateway - IPFS 网关 URL（可选）
 * @returns 文本内容
 */
export const downloadTextFromIPFS = async (
  ipfsHash: string,
  gateway?: string
): Promise<string> => {
  const data = await downloadFromIPFS(ipfsHash, gateway);
  const decoder = new TextDecoder();
  return decoder.decode(data);
};

/**
 * 验证 IPFS 哈希格式
 * 
 * @param hash - 要验证的哈希值
 * @returns 是否为有效的 IPFS 哈希
 */
export const isValidIPFSHash = (hash: string): boolean => {
  // IPFS v0 hashes start with "Qm" and are 46 characters long
  // IPFS v1 hashes start with "bafy" or "bafk" and can vary in length
  const v0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const v1Pattern = /^ba[fy][a-z2-7]+$/;
  
  return v0Pattern.test(hash) || v1Pattern.test(hash);
};

/**
 * 生成 IPFS 网关 URL
 * 
 * @param ipfsHash - IPFS 文件哈希
 * @param gateway - 网关基础 URL
 * @returns 完整的网关 URL
 */
export const generateIPFSGatewayURL = (
  ipfsHash: string,
  gateway: string = 'https://gateway.pinata.cloud/ipfs'
): string => {
  if (!isValidIPFSHash(ipfsHash)) {
    throw new Error('Invalid IPFS hash');
  }
  
  return `${gateway}/${ipfsHash}`;
};

/**
 * 获取可用的 IPFS 网关列表
 * 
 * @returns IPFS 网关 URL 数组
 */
export const getIPFSGateways = (): string[] => {
  return [
    'https://gateway.pinata.cloud/ipfs',
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs',
    'https://cf-ipfs.com/ipfs'
  ];
};

/**
 * 尝试从多个网关下载数据（容错机制）
 * 
 * @param ipfsHash - IPFS 文件哈希
 * @param gateways - 要尝试的网关列表（可选）
 * @returns 文件的字节数据
 */
export const downloadFromMultipleGateways = async (
  ipfsHash: string,
  gateways: string[] = getIPFSGateways()
): Promise<Uint8Array> => {
  let lastError: Error | null = null;

  for (const gateway of gateways) {
    try {
      console.log(`Trying gateway: ${gateway}`);
      const data = await downloadFromIPFS(ipfsHash, gateway);
      console.log(`Successfully downloaded from: ${gateway}`);
      return data;
    } catch (err) {
      console.warn(`Failed to download from ${gateway}:`, err);
      lastError = err instanceof Error ? err : new Error('Unknown error');
      continue;
    }
  }

  throw new Error(`Failed to download from all gateways. Last error: ${lastError?.message}`);
};

/**
 * 检查 Pinata 配置是否正确
 * 
 * @returns 是否配置正确
 */
export const isPinataConfigured = (): boolean => {
  return !!process.env.NEXT_PUBLIC_PINATA_JWT;
}; 