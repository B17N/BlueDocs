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
