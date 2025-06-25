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
  "function getDocumentInfo(uint256 _tokenId) external view returns (tuple(string documentId, string docUID, string rootDocumentId, string storageAddress, string docMemo, uint256 createdAt, address creator))"
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
 * 根据 IPFS 哈希和加密信息创建文档 NFT
 * 
 * @param ipfsHash - IPFS 文件哈希
 * @param encryptionKey - 加密密钥
 * @param nonce - 加密 nonce
 * @param walletAddress - 钱包地址
 * @returns 交易哈希
 */
export const mintDocumentFromIPFS = async (
  ipfsHash: string,
  encryptionKey: string,
  nonce: string,
  walletAddress: string
): Promise<string> => {
  const params: CreateDocumentParams = {
    recipient: walletAddress,
    amount: 1,
    documentId: ipfsHash.substring(0, 8), // 简短 ID
    docUID: ipfsHash, // 唯一 ID
    rootDocumentId: "",
    storageAddress: ipfsHash,
    docMemo: `Key: ${encryptionKey}, Nonce: ${nonce}`
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
    const contract = getDocumentNFTContract();
    
    // 获取当前最大的 tokenId
    const currentTokenId = await contract.getCurrentTokenId();
    const maxTokenId = Number(currentTokenId);
    
    const nfts: NFTInfo[] = [];
    
    // 遍历所有可能的 tokenId，检查当前钱包是否拥有
    for (let tokenId = 1; tokenId < maxTokenId; tokenId++) {
      try {
        const balance = await contract.balanceOf(walletAddress, tokenId);
        
        if (Number(balance) > 0) {
          // 获取 NFT 详细信息
          const docInfo = await contract.getDocumentInfo(tokenId);
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
        console.log(`Token ${tokenId} does not exist or error:`, err);
      }
    }
    
    return nfts;
  } catch (err) {
    console.error('Error getting user NFTs:', err);
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
 * 从 NFT memo 中解析加密密钥和 nonce
 * 
 * @param docMemo - NFT 的备注信息
 * @returns 解析出的密钥和 nonce，如果解析失败则返回 null
 */
export const parseEncryptionInfoFromMemo = (docMemo: string): { key: string; nonce: string } | null => {
  try {
    if (docMemo.includes('Key:') && docMemo.includes('Nonce:')) {
      const keyMatch = docMemo.match(/Key:\s*([^,]+)/);
      const nonceMatch = docMemo.match(/Nonce:\s*(.+)/);
      
      if (keyMatch && nonceMatch) {
        return {
          key: keyMatch[1].trim(),
          nonce: nonceMatch[1].trim()
        };
      }
    }
    return null;
  } catch (err) {
    console.error('Error parsing encryption info from memo:', err);
    return null;
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