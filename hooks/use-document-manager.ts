import { useState, useCallback } from 'react';
import { encryptText, decryptData } from '@/lib/encryption';
import { encryptWithMetaMask, decryptWithMetaMask } from '@/lib/metamask-crypto';
import { uploadToIPFS, downloadFromIPFS } from '@/lib/ipfs';
import { 
  mintDocumentFromIPFS, 
  getUserNFTs, 
  parseEncryptionInfoFromMemo,
  type NFTInfo 
} from '@/lib/contract';
import { useWallet } from './use-wallet';

/**
 * 文档加密和上传结果
 */
export interface DocumentUploadResult {
  ipfsHash: string;
  encryptionKey: string;
  nonce: string;
  encryptedKeys?: {
    encryptedKey: string;
    encryptedNonce: string;
  };
}

/**
 * 文档解密结果
 */
export interface DocumentDecryptResult {
  content: string;
  metadata?: {
    ipfsHash: string;
    encryptionKey: string;
    nonce: string;
  };
}

/**
 * 操作状态
 */
export interface OperationState {
  isLoading: boolean;
  error: string;
  success: boolean;
}

/**
 * 文档管理 Hook
 * 提供完整的文档加密、上传、下载、解密和 NFT 铸造功能
 */
export const useDocumentManager = () => {
  const wallet = useWallet();
  
  // 状态管理
  const [uploadState, setUploadState] = useState<OperationState>({
    isLoading: false,
    error: '',
    success: false
  });
  
  const [decryptState, setDecryptState] = useState<OperationState>({
    isLoading: false,
    error: '',
    success: false
  });
  
  const [nftState, setNftState] = useState<OperationState>({
    isLoading: false,
    error: '',
    success: false
  });
  
  const [userNFTs, setUserNFTs] = useState<NFTInfo[]>([]);

  /**
   * 加密并上传文档到 IPFS
   * 
   * @param content - 要加密的文档内容
   * @param useMetaMaskEncryption - 是否使用 MetaMask 加密密钥
   * @returns 上传结果
   */
  const encryptAndUpload = useCallback(async (
    content: string,
    useMetaMaskEncryption: boolean = true
  ): Promise<DocumentUploadResult> => {
    if (!content.trim()) {
      throw new Error('Document content cannot be empty');
    }

    if (useMetaMaskEncryption && !wallet.isConnected) {
      throw new Error('Wallet must be connected for MetaMask encryption');
    }

    setUploadState({ isLoading: true, error: '', success: false });

    try {
      // 1. 使用 TweetNaCl 加密内容
      const { encryptedData, key, nonce } = encryptText(content);
      
      let encryptedKeys;
      if (useMetaMaskEncryption && wallet.publicKey) {
        // 2. 使用 MetaMask 加密密钥和 nonce
        const encryptedKey = await encryptWithMetaMask(key, wallet.publicKey);
        const encryptedNonce = await encryptWithMetaMask(nonce, wallet.publicKey);
        
        encryptedKeys = {
          encryptedKey,
          encryptedNonce
        };
      }

      // 3. 上传加密数据到 IPFS
      const uploadResult = await uploadToIPFS(encryptedData, {
        fileName: 'encrypted-document.bin',
        metadata: {
          encrypted: true,
          timestamp: new Date().toISOString(),
          hasMetaMaskKeys: !!encryptedKeys
        }
      });

      const result: DocumentUploadResult = {
        ipfsHash: uploadResult.IpfsHash,
        encryptionKey: key,
        nonce,
        encryptedKeys
      };

      setUploadState({ isLoading: false, error: '', success: true });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Upload failed';
      setUploadState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.publicKey]);

  /**
   * 从 IPFS 下载并解密文档
   * 
   * @param ipfsHash - IPFS 文件哈希
   * @param encryptionKey - 解密密钥
   * @param nonce - 解密 nonce
   * @returns 解密结果
   */
  const downloadAndDecrypt = useCallback(async (
    ipfsHash: string,
    encryptionKey: string,
    nonce: string
  ): Promise<DocumentDecryptResult> => {
    if (!ipfsHash || !encryptionKey || !nonce) {
      throw new Error('IPFS hash, encryption key, and nonce are required');
    }

    setDecryptState({ isLoading: true, error: '', success: false });

    try {
      // 1. 从 IPFS 下载加密数据
      const encryptedData = await downloadFromIPFS(ipfsHash);

      // 2. 解密数据
      const content = decryptData(encryptedData, encryptionKey, nonce);

      const result: DocumentDecryptResult = {
        content,
        metadata: {
          ipfsHash,
          encryptionKey,
          nonce
        }
      };

      setDecryptState({ isLoading: false, error: '', success: true });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Decryption failed';
      setDecryptState({ isLoading: false, error, success: false });
      throw err;
    }
  }, []);

  /**
   * 使用 MetaMask 解密密钥后下载并解密文档
   * 
   * @param ipfsHash - IPFS 文件哈希
   * @param encryptedKey - MetaMask 加密的密钥
   * @param encryptedNonce - MetaMask 加密的 nonce
   * @returns 解密结果
   */
  const downloadAndDecryptWithMetaMask = useCallback(async (
    ipfsHash: string,
    encryptedKey: string,
    encryptedNonce: string
  ): Promise<DocumentDecryptResult> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected for MetaMask decryption');
    }

    setDecryptState({ isLoading: true, error: '', success: false });

    try {
      // 1. 使用 MetaMask 解密密钥和 nonce
      const decryptedKey = await decryptWithMetaMask(encryptedKey, wallet.address);
      const decryptedNonce = await decryptWithMetaMask(encryptedNonce, wallet.address);

      // 2. 下载并解密文档
      return await downloadAndDecrypt(ipfsHash, decryptedKey, decryptedNonce);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'MetaMask decryption failed';
      setDecryptState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.address, downloadAndDecrypt]);

  /**
   * 创建文档 NFT
   * 
   * @param uploadResult - 文档上传结果
   * @returns 交易哈希
   */
  const createDocumentNFT = useCallback(async (
    uploadResult: DocumentUploadResult
  ): Promise<string> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected to create NFT');
    }

    setNftState({ isLoading: true, error: '', success: false });

    try {
      const txHash = await mintDocumentFromIPFS(
        uploadResult.ipfsHash,
        uploadResult.encryptionKey,
        uploadResult.nonce,
        wallet.address
      );

      setNftState({ isLoading: false, error: '', success: true });
      
      // 刷新用户 NFT 列表
      await loadUserNFTs();
      
      return txHash;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'NFT creation failed';
      setNftState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.address]);

  /**
   * 完整的文档发布流程：加密 + 上传 + 创建 NFT
   * 
   * @param content - 文档内容
   * @param createNFT - 是否创建 NFT
   * @returns 发布结果
   */
  const publishDocument = useCallback(async (
    content: string,
    createNFT: boolean = true
  ): Promise<{ uploadResult: DocumentUploadResult; txHash?: string }> => {
    // 1. 加密并上传
    const uploadResult = await encryptAndUpload(content, true);

    let txHash;
    if (createNFT) {
      // 2. 创建 NFT
      txHash = await createDocumentNFT(uploadResult);
    }

    return { uploadResult, txHash };
  }, [encryptAndUpload, createDocumentNFT]);

  /**
   * 加载用户拥有的所有 NFT
   */
  const loadUserNFTs = useCallback(async (): Promise<void> => {
    if (!wallet.isConnected) {
      setUserNFTs([]);
      return;
    }

    setNftState({ isLoading: true, error: '', success: false });

    try {
      const nfts = await getUserNFTs(wallet.address);
      setUserNFTs(nfts);
      setNftState({ isLoading: false, error: '', success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load NFTs';
      setNftState({ isLoading: false, error, success: false });
      setUserNFTs([]);
    }
  }, [wallet.isConnected, wallet.address]);

  /**
   * 从 NFT 信息中解密文档
   * 
   * @param nft - NFT 信息
   * @returns 解密结果
   */
  const decryptDocumentFromNFT = useCallback(async (
    nft: NFTInfo
  ): Promise<DocumentDecryptResult> => {
    // 尝试从 memo 中解析加密信息
    const encryptionInfo = parseEncryptionInfoFromMemo(nft.docMemo);
    
    if (encryptionInfo) {
      // 使用解析出的密钥和 nonce 直接解密
      return await downloadAndDecrypt(
        nft.storageAddress,
        encryptionInfo.key,
        encryptionInfo.nonce
      );
    } else {
      throw new Error('Cannot parse encryption information from NFT memo');
    }
  }, [downloadAndDecrypt]);

  /**
   * 重置所有状态
   */
  const resetStates = useCallback(() => {
    setUploadState({ isLoading: false, error: '', success: false });
    setDecryptState({ isLoading: false, error: '', success: false });
    setNftState({ isLoading: false, error: '', success: false });
  }, []);

  return {
    // 钱包状态
    wallet,
    
    // 操作状态
    uploadState,
    decryptState,
    nftState,
    userNFTs,
    
    // 核心功能
    encryptAndUpload,
    downloadAndDecrypt,
    downloadAndDecryptWithMetaMask,
    createDocumentNFT,
    publishDocument,
    
    // NFT 相关
    loadUserNFTs,
    decryptDocumentFromNFT,
    
    // 工具函数
    resetStates,
    
    // 便捷状态检查
    isAnyLoading: uploadState.isLoading || decryptState.isLoading || nftState.isLoading,
    hasAnyError: !!(uploadState.error || decryptState.error || nftState.error),
    allErrors: [uploadState.error, decryptState.error, nftState.error].filter(Boolean)
  };
}; 