import { ethers } from 'ethers';

/**
 * DocumentNFT 智能合约交互工具函数
 * 用于创建文档 NFT、查询 NFT 信息等操作
 */

// 合约 ABI（仅包含必要的方法）
export const DOCUMENT_NFT_ABI = [
  "function createDocument(address _to, uint256 _amount, string _documentId, string _docUID, string _rootDocumentId, string _storageAddress, string _docMemo) external returns (uint256)",
  "function getCurrentTokenId() external view returns (uint256)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function getDocumentInfo(uint256 _tokenId) external view returns (tuple(string documentId, string docUID, string rootDocumentId, string storageAddress, string docMemo, uint256 createdAt, address creator))",
  "function updateDocumentMemo(uint256 _tokenId, string _newMemo) external"
];

// 从环境变量获取合约地址
export const getContractAddress = (): string => {
  const address = process.env.NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS;
  if (!address) {
    throw new Error('DocumentNFT contract address not configured. Please set NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS environment variable.');
  }
  return address;
};

/**
 * 文档信息接口
 */
export interface DocumentInfo {
  documentId: string;
  docUID: string;
  rootDocumentId: string;
  storageAddress: string;
  docMemo: string;
  createdAt: Date;
  creator: string;
}

/**
 * NFT 信息接口
 */
export interface NFTInfo extends DocumentInfo {
  tokenId: number;
  balance: number;
}

/**
 * 创建文档参数接口
 */
export interface CreateDocumentParams {
  recipient: string;
  amount: number;
  documentId: string;
  docUID: string;
  rootDocumentId?: string;
  storageAddress: string;
  docMemo?: string;
}

/**
 * 获取合约实例
 * 
 * @param signer - 以太坊签名者（可选，提供时为可写合约）
 * @returns 合约实例
 */
export const getDocumentNFTContract = (signer?: ethers.Signer) => {
  const contractAddress = getContractAddress();
  
  if (signer) {
    return new ethers.Contract(contractAddress, DOCUMENT_NFT_ABI, signer);
  } else {
    // 只读合约，使用默认 provider
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      return new ethers.Contract(contractAddress, DOCUMENT_NFT_ABI, provider);
    } else {
      throw new Error('No Ethereum provider available');
    }
  }
};

/**
 * 创建文档 NFT
 * 
 * @param params - 创建文档参数
 * @param walletAddress - 钱包地址
 * @returns 交易哈希
 */
export const createDocumentNFT = async (
  params: CreateDocumentParams,
  walletAddress: string
): Promise<string> => {
  try {
    // 获取 provider 和 signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // 获取合约实例
    const contract = getDocumentNFTContract(signer);
    
    const {
      recipient,
      amount,
      documentId,
      docUID,
      rootDocumentId = "",
      storageAddress,
      docMemo = ""
    } = params;
    
    // 调用合约方法
    const tx = await contract.createDocument(
      recipient,
      amount,
      documentId,
      docUID,
      rootDocumentId,
      storageAddress,
      docMemo
    );
    
    console.log('Transaction sent:', tx.hash);
    
    // 等待交易确认
    await tx.wait();
    console.log('Transaction confirmed:', tx.hash);
    
    return tx.hash;
  } catch (err) {
    console.error('Create document NFT error:', err);
    throw new Error(`Failed to create document NFT: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 文档元数据接口
 */
export interface DocumentMetadataForNFT {
  fileName: string;
  fileType: string;
  title: string;
  createdAt: string;
  updatedAt: string;  // 最后更新时间
  size: number;       // 当前版本的大小
  isVisible: boolean; // 用于实现假删除功能
}

/**
 * 文档版本接口
 */
export interface DocumentVersion {
  versionId: number;
  ipfsHash: string;
  timestamp: string;
  size: number;
  encryptedKey: string;
  encryptedNonce: string;
}

/**
 * docMemo 的结构化数据接口
 */
export interface DocMemoData {
  version: string;
  metadata: DocumentMetadataForNFT;
  versions: DocumentVersion[];     // 版本数组
  currentVersion: number;          // 当前版本号
}

/**
 * 根据 IPFS 哈希和加密信息创建文档 NFT
 * 
 * @param ipfsHash - IPFS 文件哈希
 * @param encryptionKey - 加密密钥
 * @param nonce - 加密 nonce
 * @param walletAddress - 钱包地址
 * @param metadata - 文档元数据
 * @param encryptedKeys - MetaMask 加密后的密钥信息
 * @returns 交易哈希
 */
export const mintDocumentFromIPFS = async (
  ipfsHash: string,
  encryptionKey: string,
  nonce: string,
  walletAddress: string,
  metadata: DocumentMetadataForNFT,
  encryptedKeys?: { 
    encryptedCombined?: string;
    encryptedKey?: string; 
    encryptedNonce?: string; 
  }
): Promise<string> => {
  // 创建第一个版本
  const firstVersion: DocumentVersion = {
    versionId: 1,
    ipfsHash,
    timestamp: metadata.createdAt,
    size: metadata.size,
    // 根据格式决定使用哪种加密方式
    encryptedKey: encryptedKeys?.encryptedCombined 
      ? encryptedKeys.encryptedCombined 
      : (encryptedKeys?.encryptedKey || encryptionKey),
    encryptedNonce: encryptedKeys?.encryptedCombined 
      ? "COMBINED_FORMAT" // 特殊标记，表示使用合并格式
      : (encryptedKeys?.encryptedNonce || nonce)
  };

  // 创建结构化的 docMemo
  const docMemoData: DocMemoData = {
    version: "1.0",
    metadata,
    versions: [firstVersion],
    currentVersion: 1
  };

  const params: CreateDocumentParams = {
    recipient: walletAddress,
    amount: 1,
    documentId: ipfsHash.substring(0, 8), // 简短 ID
    docUID: ipfsHash, // 唯一 ID
    rootDocumentId: "",
    storageAddress: ipfsHash,
    docMemo: JSON.stringify(docMemoData)
  };
  
  return createDocumentNFT(params, walletAddress);
};

/**
 * 获取用户拥有的所有 NFT
 * 
 * @param walletAddress - 钱包地址
 * @returns NFT 信息数组
 */
export const getUserNFTs = async (walletAddress: string): Promise<NFTInfo[]> => {
  try {
    console.log('[GET_USER_NFTS] Starting to fetch NFTs for address:', walletAddress);
    const contract = getDocumentNFTContract();
    
    // 获取当前最大的 tokenId
    const currentTokenId = await contract.getCurrentTokenId();
    const maxTokenId = Number(currentTokenId);
    
    console.log('[GET_USER_NFTS] Current max tokenId from contract:', maxTokenId);
    
    const nfts: NFTInfo[] = [];
    
    // 遍历所有可能的 tokenId，检查当前钱包是否拥有
    // 使用 <= 确保包含最新创建的NFT
    for (let tokenId = 1; tokenId <= maxTokenId; tokenId++) {
      try {
        const balance = await contract.balanceOf(walletAddress, tokenId);
        console.log(`[GET_USER_NFTS] TokenId ${tokenId}: balance = ${balance}`);
        
        if (Number(balance) > 0) {
          // 获取 NFT 详细信息
          const docInfo = await contract.getDocumentInfo(tokenId);
          console.log(`[GET_USER_NFTS] TokenId ${tokenId}: Found owned NFT, docUID = ${docInfo.docUID}`);
          
          nfts.push({
            tokenId,
            balance: Number(balance),
            documentId: docInfo.documentId,
            docUID: docInfo.docUID,
            rootDocumentId: docInfo.rootDocumentId,
            storageAddress: docInfo.storageAddress,
            docMemo: docInfo.docMemo,
            createdAt: new Date(Number(docInfo.createdAt) * 1000),
            creator: docInfo.creator
          });
        }
      } catch (err) {
        // 忽略不存在的 tokenId 错误
        console.log(`[GET_USER_NFTS] Token ${tokenId} does not exist or error:`, err);
      }
    }
    
    console.log('[GET_USER_NFTS] Total NFTs found:', nfts.length);
    console.log('[GET_USER_NFTS] NFT tokenIds found:', nfts.map(n => n.tokenId));
    
    return nfts;
  } catch (err) {
    console.error('[GET_USER_NFTS] Error getting user NFTs:', err);
    throw new Error(`Failed to get user NFTs: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 获取指定 NFT 的详细信息
 * 
 * @param tokenId - NFT Token ID
 * @returns 文档信息
 */
export const getDocumentInfo = async (tokenId: number): Promise<DocumentInfo> => {
  try {
    const contract = getDocumentNFTContract();
    const docInfo = await contract.getDocumentInfo(tokenId);
    
    return {
      documentId: docInfo.documentId,
      docUID: docInfo.docUID,
      rootDocumentId: docInfo.rootDocumentId,
      storageAddress: docInfo.storageAddress,
      docMemo: docInfo.docMemo,
      createdAt: new Date(Number(docInfo.createdAt) * 1000),
      creator: docInfo.creator
    };
  } catch (err) {
    console.error('Error getting document info:', err);
    throw new Error(`Failed to get document info: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 获取用户在指定 NFT 中的余额
 * 
 * @param walletAddress - 钱包地址
 * @param tokenId - NFT Token ID
 * @returns 余额数量
 */
export const getUserNFTBalance = async (
  walletAddress: string, 
  tokenId: number
): Promise<number> => {
  try {
    const contract = getDocumentNFTContract();
    const balance = await contract.balanceOf(walletAddress, tokenId);
    return Number(balance);
  } catch (err) {
    console.error('Error getting NFT balance:', err);
    throw new Error(`Failed to get NFT balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 获取当前最大的 Token ID
 * 
 * @returns 当前最大的 Token ID
 */
export const getCurrentTokenId = async (): Promise<number> => {
  try {
    const contract = getDocumentNFTContract();
    const currentTokenId = await contract.getCurrentTokenId();
    return Number(currentTokenId);
  } catch (err) {
    console.error('Error getting current token ID:', err);
    throw new Error(`Failed to get current token ID: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 从 NFT memo 中解析文档信息
 * 
 * @param docMemo - NFT 的备注信息
 * @returns 解析出的文档信息，如果解析失败则返回 null
 */
export const parseDocMemoData = (docMemo: string): DocMemoData | null => {
  try {
    // 尝试解析新格式（JSON）
    const parsed = JSON.parse(docMemo);
    if (parsed.version && parsed.metadata && parsed.versions) {
      return parsed as DocMemoData;
    }
    return null;
  } catch (err) {
    // 如果 JSON 解析失败，尝试兼容旧格式
    return parseLegacyDocMemo(docMemo);
  }
};

/**
 * 解析旧格式的 docMemo（向后兼容）
 * 
 * @param docMemo - 旧格式的 NFT 备注信息
 * @returns 转换为新格式的文档信息
 */
export const parseLegacyDocMemo = (docMemo: string): DocMemoData | null => {
  try {
    // 尝试不同的旧格式
    
    // 格式1: "Key: [key], Nonce: [nonce]"
    if (docMemo.includes('Key:') && docMemo.includes('Nonce:')) {
      const keyMatch = docMemo.match(/Key:\s*([^,\s]+)/);
      const nonceMatch = docMemo.match(/Nonce:\s*([^,\s]+)/);
      
      if (keyMatch && nonceMatch) {
        const now = new Date().toISOString();
        return {
          version: "0.9", // 标记为旧版本
          metadata: {
            fileName: "Legacy Document.md",
            fileType: "markdown",
            title: "Legacy Document",
            createdAt: now,
            updatedAt: now,
            size: 0,
            isVisible: true // 旧版本默认显示
          },
          versions: [{
            versionId: 1,
            ipfsHash: "",
            timestamp: now,
            size: 0,
            encryptedKey: keyMatch[1].trim(),
            encryptedNonce: nonceMatch[1].trim()
          }],
          currentVersion: 1
        };
      }
    }
    
    // 格式2: 简单的JSON但没有versions字段
    try {
      const parsed = JSON.parse(docMemo);
      if (parsed && typeof parsed === 'object' && !parsed.versions) {
        // 这可能是早期的JSON格式，但没有versions字段
        const now = new Date().toISOString();
        
        // 尝试提取加密信息
        let encryptedKey = '';
        let encryptedNonce = '';
        
        if (parsed.encryption) {
          encryptedKey = parsed.encryption.encryptedKey || '';
          encryptedNonce = parsed.encryption.encryptedNonce || '';
        } else if (parsed.encryptedKey && parsed.encryptedNonce) {
          encryptedKey = parsed.encryptedKey;
          encryptedNonce = parsed.encryptedNonce;
        }
        
        if (encryptedKey && encryptedNonce) {
          return {
            version: "0.9",
            metadata: {
              fileName: parsed.metadata?.fileName || "Legacy Document.md",
              fileType: parsed.metadata?.fileType || "markdown", 
              title: parsed.metadata?.title || "Legacy Document",
              createdAt: parsed.metadata?.createdAt || now,
              updatedAt: parsed.metadata?.updatedAt || now,
              size: parsed.metadata?.size || 0,
              isVisible: parsed.metadata?.isVisible !== false // 默认为true
            },
            versions: [{
              versionId: 1,
              ipfsHash: "",
              timestamp: parsed.metadata?.createdAt || now,
              size: parsed.metadata?.size || 0,
              encryptedKey,
              encryptedNonce
            }],
            currentVersion: 1
          };
        }
      }
    } catch (e) {
      // JSON解析失败，继续其他格式尝试
    }
    
    return null;
  } catch (err) {
    console.error('Error parsing legacy doc memo:', err);
    return null;
  }
};

/**
 * 从 NFT memo 中解析加密密钥和 nonce（兼容性函数）
 * 
 * @param docMemo - NFT 的备注信息
 * @returns 解析出的密钥和 nonce，如果解析失败则返回 null
 */
export const parseEncryptionInfoFromMemo = (docMemo: string): { key: string; nonce: string } | null => {
  // 先尝试解析结构化数据
  const docMemoData = parseDocMemoData(docMemo);
  if (docMemoData && docMemoData.versions && docMemoData.versions.length > 0) {
    // 获取当前版本的加密信息
    const currentVersionData = docMemoData.versions.find(v => v.versionId === docMemoData.currentVersion) 
      || docMemoData.versions[docMemoData.versions.length - 1]; // 如果找不到当前版本，使用最后一个版本

    return {
      key: currentVersionData.encryptedKey,
      nonce: currentVersionData.encryptedNonce
    };
  }
  
  // 如果结构化解析失败，尝试直接解析旧格式
  try {
    // 格式: "Key: [key], Nonce: [nonce]"
    if (docMemo.includes('Key:') && docMemo.includes('Nonce:')) {
      const keyMatch = docMemo.match(/Key:\s*([^,\s]+)/);
      const nonceMatch = docMemo.match(/Nonce:\s*([^,\s]+)/);
      
      if (keyMatch && nonceMatch) {
        return {
          key: keyMatch[1].trim(),
          nonce: nonceMatch[1].trim()
        };
      }
    }
    
    // 尝试简单的JSON格式
    const parsed = JSON.parse(docMemo);
    if (parsed && typeof parsed === 'object') {
      // 检查多种可能的加密信息位置
      if (parsed.encryption && parsed.encryption.encryptedKey && parsed.encryption.encryptedNonce) {
        return {
          key: parsed.encryption.encryptedKey,
          nonce: parsed.encryption.encryptedNonce
        };
      }
      
      if (parsed.encryptedKey && parsed.encryptedNonce) {
        return {
          key: parsed.encryptedKey,
          nonce: parsed.encryptedNonce
        };
      }
    }
  } catch (err) {
    console.log('Failed to parse docMemo as JSON:', err);
  }
  
  return null;
};

/**
 * 更新 NFT 的 docMemo 字段
 * 
 * @param tokenId - NFT Token ID
 * @param newMemo - 新的 memo 内容
 * @param walletAddress - 钱包地址
 * @returns 交易哈希
 */
export const updateDocumentMemo = async (
  tokenId: number,
  newMemo: string,
  walletAddress: string
): Promise<string> => {
  try {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = getDocumentNFTContract(signer);

    // 调用合约的 updateDocumentMemo 函数
    const tx = await contract.updateDocumentMemo(tokenId, newMemo);
    
    console.log('Update memo transaction sent:', tx.hash);
    
    // 等待交易确认
    await tx.wait();
    console.log('Update memo transaction confirmed:', tx.hash);
    
    return tx.hash;
  } catch (err) {
    console.error('Update document memo error:', err);
    throw new Error(`Failed to update document memo: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 检查合约配置是否正确
 * 
 * @returns 是否配置正确
 */
export const isContractConfigured = (): boolean => {
  return !!process.env.NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS;
}; 