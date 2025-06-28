import { useState, useCallback } from 'react';
import { encryptText, decryptData } from '@/lib/encryption';
import { encryptWithMetaMask, decryptWithMetaMask } from '@/lib/metamask-crypto';
import { uploadToIPFS, downloadFromIPFS } from '@/lib/ipfs';
import { 
  mintDocumentFromIPFS, 
  getUserNFTs, 
  parseEncryptionInfoFromMemo,
  parseDocMemoData,
  updateDocumentMemo,
  type NFTInfo,
  type DocMemoData,
  type DocumentMetadataForNFT,
  type DocumentVersion
} from '@/lib/contract';
import { 
  generateDocumentMetadata, 
  generateFileName, 
  detectDocumentType, 
  generatePreview, 
  extractTitle,
  type DocumentMetadata 
} from '@/lib/document-utils';
import { useWallet, type WalletState } from './use-wallet';

/**
 * 文档加密和上传结果
 */
export interface DocumentUploadResult {
  ipfsHash: string;
  encryptionKey: string;
  nonce: string;
  encryptedKeys?: {
    // 新格式：合并的Key和Nonce加密
    encryptedCombined?: string;
    // 旧格式：分别加密（向后兼容）
    encryptedKey?: string;
    encryptedNonce?: string;
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

  console.log('[DOCUMENT_MANAGER] Initializing with wallet state:', {
    isConnected: wallet.isConnected,
    hasPublicKey: !!wallet.publicKey,
    address: wallet.address ? wallet.address.substring(0, 8) + '...' : 'none',
    timestamp: new Date().toISOString()
  });
  
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
    console.log('[ENCRYPT_AND_UPLOAD_START]', {
      useMetaMaskEncryption,
      walletConnected: wallet.isConnected,
      hasPublicKey: !!wallet.publicKey,
      publicKeyLength: wallet.publicKey?.length || 0,
      walletAddress: wallet.address ? wallet.address.substring(0, 8) + '...' : 'none',
      timestamp: new Date().toISOString()
    });

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
        console.log('[ENCRYPT_AND_UPLOAD] Using MetaMask encryption with combined format', {
          publicKeyExists: !!wallet.publicKey,
          timestamp: new Date().toISOString()
        });
        
        // 2. 将Key和Nonce合并为一个JSON对象，然后用MetaMask加密（新格式）
        const combinedKeys = JSON.stringify({ key, nonce });
        const encryptedCombined = await encryptWithMetaMask(combinedKeys, wallet.publicKey);
        
        encryptedKeys = {
          encryptedCombined
        };
      } else if (useMetaMaskEncryption && !wallet.publicKey) {
        console.warn('[ENCRYPT_AND_UPLOAD] MetaMask encryption requested but no public key available', {
          walletConnected: wallet.isConnected,
          timestamp: new Date().toISOString()
        });
      }

      // 3. 上传加密数据到 IPFS
      const uploadResult = await uploadToIPFS(encryptedData, {
        fileName: 'encrypted-document.bin',
        metadata: {
          encrypted: 'true',
          timestamp: new Date().toISOString(),
          hasMetaMaskKeys: encryptedKeys ? 'true' : 'false',
          encryptionFormat: encryptedKeys ? 'combined' : 'plain'
        }
      });

      console.log('[ENCRYPT_AND_UPLOAD_SUCCESS]', {
        ipfsHash: uploadResult.IpfsHash.substring(0, 20) + '...',
        hasEncryptedKeys: !!encryptedKeys,
        encryptionFormat: encryptedKeys ? 'combined' : 'plain',
        timestamp: new Date().toISOString()
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
      console.error('[ENCRYPT_AND_UPLOAD_ERROR]', {
        error,
        timestamp: new Date().toISOString()
      });
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
      // 1. 使用 MetaMask 解密密钥和 nonce（旧格式）
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
   * 使用 MetaMask 解密合并的密钥后下载并解密文档（新格式）
   * 
   * @param ipfsHash - IPFS 文件哈希
   * @param encryptedCombined - MetaMask 加密的合并密钥和nonce
   * @returns 解密结果
   */
  const downloadAndDecryptWithMetaMaskCombined = useCallback(async (
    ipfsHash: string,
    encryptedCombined: string
  ): Promise<DocumentDecryptResult> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected for MetaMask decryption');
    }

    setDecryptState({ isLoading: true, error: '', success: false });

    try {
      // 1. 使用 MetaMask 解密合并的密钥（新格式，只需要一次确认）
      const decryptedCombined = await decryptWithMetaMask(encryptedCombined, wallet.address);
      
      // 2. 解析出密钥和nonce
      const { key: decryptedKey, nonce: decryptedNonce } = JSON.parse(decryptedCombined);

      // 3. 下载并解密文档
      return await downloadAndDecrypt(ipfsHash, decryptedKey, decryptedNonce);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'MetaMask combined decryption failed';
      setDecryptState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.address, downloadAndDecrypt]);

  /**
   * 创建文档 NFT
   * 
   * @param uploadResult - 文档上传结果
   * @param content - 原始文档内容（用于生成元数据）
   * @param fileName - 文件名（可选）
   * @returns 交易哈希
   */
  const createDocumentNFT = useCallback(async (
    uploadResult: DocumentUploadResult,
    content: string,
    fileName?: string
  ): Promise<string> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected to create NFT');
    }

    setNftState({ isLoading: true, error: '', success: false });

    try {
      // 生成文档元数据
      const docMetadata = generateDocumentMetadata(content, fileName);
      const docType = detectDocumentType(content, fileName);
      const docTitle = extractTitle(content, docType);
      const suggestedFileName = fileName || generateFileName(content, docType);

      const now = new Date().toISOString();
      const metadata: DocumentMetadataForNFT = {
        fileName: suggestedFileName,
        fileType: docType,
        title: docTitle,
        createdAt: now,
        updatedAt: now,
        size: content.length,
        isVisible: true // 新创建的文档默认显示
      };

      const txHash = await mintDocumentFromIPFS(
        uploadResult.ipfsHash,
        uploadResult.encryptionKey,
        uploadResult.nonce,
        wallet.address,
        metadata,
        uploadResult.encryptedKeys
      );

      setNftState({ isLoading: false, error: '', success: true });
      
      console.log('[CREATE_NFT_SUCCESS] NFT created, tx:', txHash);
      console.log('[CREATE_NFT_SUCCESS] Current NFT count before refresh:', userNFTs.length);
      
      // 等待区块链状态同步，然后刷新用户 NFT 列表
      // 添加延迟确保区块链状态完全同步到读取节点
      console.log('[CREATE_NFT_SUCCESS] Waiting 1 second for blockchain sync...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 减少到1秒
      
      console.log('[CREATE_NFT_SUCCESS] Starting to refresh NFT list...');
      await loadUserNFTs();
      console.log('[CREATE_NFT_SUCCESS] NFT refresh completed, new count:', userNFTs.length);
      
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
   * @param fileName - 文件名（可选）
   * @returns 发布结果
   */
  const publishDocument = useCallback(async (
    content: string,
    createNFT: boolean = true,
    fileName?: string
  ): Promise<{ uploadResult: DocumentUploadResult; txHash?: string }> => {
    // 1. 加密并上传
    const uploadResult = await encryptAndUpload(content, true);

    let txHash;
    if (createNFT) {
      // 2. 创建 NFT
      txHash = await createDocumentNFT(uploadResult, content, fileName);
    }

    return { uploadResult, txHash };
  }, [encryptAndUpload, createDocumentNFT]);

  /**
   * 更新现有文档，添加新版本
   * 
   * @param nft - 要更新的 NFT 信息
   * @param content - 新的文档内容
   * @param fileName - 新的文件名（可选）
   * @returns 交易哈希
   */
  const updateDocument = useCallback(async (
    nft: NFTInfo,
    content: string,
    fileName?: string
  ): Promise<string> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected to update document');
    }

    setNftState({ isLoading: true, error: '', success: false });

    try {
      // 1. 加密并上传新内容
      const uploadResult = await encryptAndUpload(content, true);

      // 2. 解析当前 docMemo
      const docMemoData = parseDocMemoData(nft.docMemo);
      if (!docMemoData) {
        throw new Error('Cannot parse document memo data');
      }

      // 3. 生成新版本元数据
      const docType = detectDocumentType(content, fileName);
      const docTitle = extractTitle(content, docType);
      const suggestedFileName = fileName || docMemoData.metadata.fileName;
      const now = new Date().toISOString();
      
      // 4. 处理版本控制（兼容旧格式）
      let newVersionId: number;
      let existingVersions: DocumentVersion[];
      
      if (docMemoData.versions && docMemoData.versions.length > 0) {
        // 新格式：已有版本数组
        existingVersions = docMemoData.versions;
        newVersionId = Math.max(...docMemoData.versions.map(v => v.versionId)) + 1;
      } else {
        // 旧格式：需要从旧的加密信息创建第一个版本
        const encryptionInfo = parseEncryptionInfoFromMemo(nft.docMemo);
        if (encryptionInfo) {
          const firstVersion: DocumentVersion = {
            versionId: 1,
            ipfsHash: nft.storageAddress,
            timestamp: docMemoData.metadata.createdAt,
            size: docMemoData.metadata.size || 0,
            encryptedKey: encryptionInfo.key,
            encryptedNonce: encryptionInfo.nonce
          };
          existingVersions = [firstVersion];
          newVersionId = 2;
        } else {
          throw new Error('Cannot parse legacy encryption information');
        }
      }
      const newVersion: DocumentVersion = {
        versionId: newVersionId,
        ipfsHash: uploadResult.ipfsHash,
        timestamp: now,
        size: content.length,
        encryptedKey: uploadResult.encryptedKeys?.encryptedCombined 
          ? uploadResult.encryptedKeys.encryptedCombined 
          : (uploadResult.encryptedKeys?.encryptedKey || uploadResult.encryptionKey),
        encryptedNonce: uploadResult.encryptedKeys?.encryptedCombined 
          ? "COMBINED_FORMAT" // 特殊标记，表示使用合并格式
          : (uploadResult.encryptedKeys?.encryptedNonce || uploadResult.nonce)
      };

      // 5. 更新 docMemo 数据
      const updatedDocMemoData: DocMemoData = {
        ...docMemoData,
        metadata: {
          ...docMemoData.metadata,
          fileName: suggestedFileName,
          title: docTitle,
          updatedAt: now,
          size: content.length
        },
        versions: [...existingVersions, newVersion],
        currentVersion: newVersionId
      };

      // 6. 调用合约更新 docMemo
      const txHash = await updateDocumentMemo(
        nft.tokenId,
        JSON.stringify(updatedDocMemoData),
        wallet.address
      );

      console.log('Document updated successfully, tx:', txHash);

      // 7. 更新本地状态
      setUserNFTs(prevNFTs => 
        prevNFTs.map(n => 
          n.tokenId === nft.tokenId 
            ? { ...n, docMemo: JSON.stringify(updatedDocMemoData) }
            : n
        )
      );

      setNftState({ isLoading: false, error: '', success: true });
      return txHash;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Document update failed';
      setNftState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.address, encryptAndUpload]);

  /**
   * 恢复历史版本为最新版本
   * 
   * @param nft - NFT 信息
   * @param versionId - 要恢复的版本 ID
   * @returns 交易哈希
   */
  const restoreVersion = useCallback(async (
    nft: NFTInfo,
    versionId: number
  ): Promise<string> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected to restore version');
    }

    setNftState({ isLoading: true, error: '', success: false });

    try {
      // 1. 解析当前 docMemo
      const docMemoData = parseDocMemoData(nft.docMemo);
      if (!docMemoData) {
        throw new Error('Cannot parse document memo data');
      }

      // 2. 找到要恢复的版本
      const versionToRestore = docMemoData.versions.find(v => v.versionId === versionId);
      if (!versionToRestore) {
        throw new Error(`Version ${versionId} not found`);
      }

      // 3. 解密旧版本内容
      const isCombinedFormat = versionToRestore.encryptedNonce === "COMBINED_FORMAT";
      let decryptResult: DocumentDecryptResult;

      if (isCombinedFormat) {
        // 新格式：使用合并的密钥解密（只需要一次MetaMask确认）
        if (!wallet.isConnected) {
          throw new Error('Wallet must be connected to decrypt MetaMask-encrypted documents');
        }
        
        decryptResult = await downloadAndDecryptWithMetaMaskCombined(
          versionToRestore.ipfsHash,
          versionToRestore.encryptedKey
        );
      } else {
        // 旧格式：检查是否使用了 MetaMask 加密
        const isMetaMaskEncrypted = versionToRestore.encryptedKey.startsWith('0x') && versionToRestore.encryptedKey.length > 100;
        
        if (isMetaMaskEncrypted) {
          decryptResult = await downloadAndDecryptWithMetaMask(
            versionToRestore.ipfsHash,
            versionToRestore.encryptedKey,
            versionToRestore.encryptedNonce
          );
        } else {
          decryptResult = await downloadAndDecrypt(
            versionToRestore.ipfsHash,
            versionToRestore.encryptedKey,
            versionToRestore.encryptedNonce
          );
        }
      }

      // 4. 重新加密并上传内容
      const uploadResult = await encryptAndUpload(decryptResult.content, true);

      // 5. 创建新版本（从旧版本恢复）
      const newVersionId = Math.max(...docMemoData.versions.map(v => v.versionId)) + 1;
      const now = new Date().toISOString();
      
      const newVersion: DocumentVersion = {
        versionId: newVersionId,
        ipfsHash: uploadResult.ipfsHash,
        timestamp: now,
        size: decryptResult.content.length,
        encryptedKey: uploadResult.encryptedKeys?.encryptedCombined 
          ? uploadResult.encryptedKeys.encryptedCombined 
          : (uploadResult.encryptedKeys?.encryptedKey || uploadResult.encryptionKey),
        encryptedNonce: uploadResult.encryptedKeys?.encryptedCombined 
          ? "COMBINED_FORMAT" // 特殊标记，表示使用合并格式
          : (uploadResult.encryptedKeys?.encryptedNonce || uploadResult.nonce)
      };

      // 6. 更新 docMemo 数据
      const updatedDocMemoData: DocMemoData = {
        ...docMemoData,
        metadata: {
          ...docMemoData.metadata,
          updatedAt: now,
          size: decryptResult.content.length
        },
        versions: [...docMemoData.versions, newVersion],
        currentVersion: newVersionId
      };

      // 7. 调用合约更新 docMemo
      const txHash = await updateDocumentMemo(
        nft.tokenId,
        JSON.stringify(updatedDocMemoData),
        wallet.address
      );

      console.log(`Version ${versionId} restored as version ${newVersionId}, tx:`, txHash);

      // 8. 更新本地状态
      setUserNFTs(prevNFTs => 
        prevNFTs.map(n => 
          n.tokenId === nft.tokenId 
            ? { ...n, docMemo: JSON.stringify(updatedDocMemoData) }
            : n
        )
      );

      setNftState({ isLoading: false, error: '', success: true });
      return txHash;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Version restore failed';
      setNftState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.address, encryptAndUpload, downloadAndDecrypt, downloadAndDecryptWithMetaMask, downloadAndDecryptWithMetaMaskCombined]);

  /**
   * 获取文档的版本历史
   * 
   * @param nft - NFT 信息
   * @returns 版本历史数组
   */
  const getVersionHistory = useCallback((nft: NFTInfo): DocumentVersion[] => {
    const docMemoData = parseDocMemoData(nft.docMemo);
    if (docMemoData && docMemoData.versions) {
      // 新格式：按版本号倒序排列（最新版本在前）
      return [...docMemoData.versions].sort((a, b) => b.versionId - a.versionId);
    } else {
      // 兼容旧格式：创建一个虚拟的版本历史
      const encryptionInfo = parseEncryptionInfoFromMemo(nft.docMemo);
      if (encryptionInfo) {
        return [{
          versionId: 1,
          ipfsHash: nft.storageAddress,
          timestamp: nft.createdAt.toISOString(),
          size: 0, // 旧格式没有大小信息
          encryptedKey: encryptionInfo.key,
          encryptedNonce: encryptionInfo.nonce
        }];
      }
    }
    return [];
  }, []);

  /**
   * 加载用户拥有的所有 NFT
   */
  const loadUserNFTs = useCallback(async (): Promise<NFTInfo[]> => {
    if (!wallet.isConnected) {
      console.log('[LOAD_USER_NFTS] Wallet not connected, clearing NFTs');
      setUserNFTs([]);
      return [];
    }

    console.log('[LOAD_USER_NFTS] Starting to load NFTs for address:', wallet.address);
    console.log('[LOAD_USER_NFTS] Current NFT count before load:', userNFTs.length);
    
    setNftState({ isLoading: true, error: '', success: false });

    try {
      const nfts = await getUserNFTs(wallet.address);
      console.log('[LOAD_USER_NFTS] getUserNFTs returned:', nfts.length, 'NFTs');
      console.log('[LOAD_USER_NFTS] NFT tokenIds:', nfts.map(n => n.tokenId));
      
      setUserNFTs(nfts);
      setNftState({ isLoading: false, error: '', success: true });
      
      console.log('[LOAD_USER_NFTS] Successfully updated userNFTs state with:', nfts.length, 'NFTs');
      return nfts; // 返回NFT列表
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load NFTs';
      console.error('[LOAD_USER_NFTS] Error loading NFTs:', error);
      setNftState({ isLoading: false, error, success: false });
      setUserNFTs([]);
      return [];
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
    console.log('Decrypting NFT:', nft.tokenId, 'memo length:', nft.docMemo.length);
    
    // 尝试解析新格式的 docMemo
    const docMemoData = parseDocMemoData(nft.docMemo);
    
    if (docMemoData && docMemoData.versions && docMemoData.versions.length > 0) {
      // 新格式：从版本数组中获取当前版本的加密信息
      const currentVersionData = docMemoData.versions.find(v => v.versionId === docMemoData.currentVersion) 
        || docMemoData.versions[docMemoData.versions.length - 1]; // 如果找不到当前版本，使用最后一个版本

      // 检查是否使用了合并格式（新格式）
      const isCombinedFormat = currentVersionData.encryptedNonce === "COMBINED_FORMAT";
      
      if (isCombinedFormat) {
        // 新格式：使用合并的密钥解密（只需要一次MetaMask确认）
        if (!wallet.isConnected) {
          throw new Error('Wallet must be connected to decrypt MetaMask-encrypted documents');
        }
        
        return await downloadAndDecryptWithMetaMaskCombined(
          currentVersionData.ipfsHash,
          currentVersionData.encryptedKey
        );
      } else {
        // 旧格式：检查是否使用了 MetaMask 加密（通过密钥长度判断）
        const isMetaMaskEncrypted = currentVersionData.encryptedKey.startsWith('0x') && currentVersionData.encryptedKey.length > 100;
        
        if (isMetaMaskEncrypted) {
          // 使用 MetaMask 解密（需要两次确认）
          if (!wallet.isConnected) {
            throw new Error('Wallet must be connected to decrypt MetaMask-encrypted documents');
          }
          
          return await downloadAndDecryptWithMetaMask(
            currentVersionData.ipfsHash,
            currentVersionData.encryptedKey,
            currentVersionData.encryptedNonce
          );
        } else {
          // 使用明文密钥解密
          return await downloadAndDecrypt(
            currentVersionData.ipfsHash,
            currentVersionData.encryptedKey,
            currentVersionData.encryptedNonce
          );
        }
      }
    } else {
      // 兼容旧格式：直接从 parseEncryptionInfoFromMemo 获取加密信息
      console.log('Trying legacy format parsing...');
      const encryptionInfo = parseEncryptionInfoFromMemo(nft.docMemo);
      console.log('Parsed encryption info:', encryptionInfo);
      
      if (encryptionInfo) {
        // 检查是否使用了 MetaMask 加密
        const isMetaMaskEncrypted = encryptionInfo.key.startsWith('0x') && encryptionInfo.key.length > 100;
        
        if (isMetaMaskEncrypted) {
          // 使用 MetaMask 解密
          if (!wallet.isConnected) {
            throw new Error('Wallet must be connected to decrypt MetaMask-encrypted documents');
          }
          
          return await downloadAndDecryptWithMetaMask(
            nft.storageAddress,
            encryptionInfo.key,
            encryptionInfo.nonce
          );
        } else {
          // 使用明文密钥解密
          return await downloadAndDecrypt(
            nft.storageAddress,
            encryptionInfo.key,
            encryptionInfo.nonce
          );
        }
      } else {
        throw new Error('Cannot parse document information from NFT memo');
      }
    }
  }, [downloadAndDecrypt, downloadAndDecryptWithMetaMask, downloadAndDecryptWithMetaMaskCombined, wallet.isConnected]);

  /**
   * 从 NFT 信息中获取文档元数据
   * 
   * @param nft - NFT 信息
   * @returns 文档元数据，如果解析失败则返回默认值
   */
  const getDocumentMetadataFromNFT = useCallback((nft: NFTInfo): DocumentMetadataForNFT => {
    console.log(`[GET_METADATA] Processing NFT ${nft.tokenId}, docMemo length: ${nft.docMemo.length}`);
    
    const docMemoData = parseDocMemoData(nft.docMemo);
    console.log(`[GET_METADATA] NFT ${nft.tokenId} parseDocMemoData result:`, !!docMemoData);
    
    if (docMemoData && docMemoData.metadata) {
      console.log(`[GET_METADATA] NFT ${nft.tokenId} using parsed metadata, isVisible: ${docMemoData.metadata.isVisible}`);
      return docMemoData.metadata;
    }
    
    // 兼容旧格式，返回默认值
    console.log(`[GET_METADATA] NFT ${nft.tokenId} using fallback metadata (legacy), isVisible: true`);
    const timestamp = nft.createdAt.toISOString();
    return {
      fileName: `Document-${nft.tokenId}.md`,
      fileType: 'markdown',
      title: `Document #${nft.tokenId}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      size: 0,
      isVisible: true // 旧格式默认显示
    };
  }, []);

  /**
   * 标记文档为不可见（假删除）
   * 通过更新链上的 docMemo 来实现持久化的软删除
   * 
   * @param nft - NFT 信息
   * @returns 是否成功标记
   */
  const markDocumentAsHidden = useCallback(async (nft: NFTInfo): Promise<boolean> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected to hide documents');
    }

    setNftState({ isLoading: true, error: '', success: false });

    try {
      // 解析当前的 docMemo
      const docMemoData = parseDocMemoData(nft.docMemo);
      
      if (!docMemoData) {
        throw new Error('Cannot parse document memo data');
      }

      // 更新 isVisible 为 false
      const updatedDocMemoData: DocMemoData = {
        ...docMemoData,
        metadata: {
          ...docMemoData.metadata,
          isVisible: false
        }
      };

      // 调用合约更新 docMemo
      const txHash = await updateDocumentMemo(
        nft.tokenId,
        JSON.stringify(updatedDocMemoData),
        wallet.address
      );

      console.log('Document hidden successfully, tx:', txHash);

      // 更新本地状态
      setUserNFTs(prevNFTs => 
        prevNFTs.map(n => 
          n.tokenId === nft.tokenId 
            ? { ...n, docMemo: JSON.stringify(updatedDocMemoData) }
            : n
        )
      );

      setNftState({ isLoading: false, error: '', success: true });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to hide document';
      setNftState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.address]);

  /**
   * 恢复文档可见性
   * 通过更新链上的 docMemo 来恢复文档显示
   * 
   * @param nft - NFT 信息
   * @returns 是否成功恢复
   */
  const restoreDocumentVisibility = useCallback(async (nft: NFTInfo): Promise<boolean> => {
    if (!wallet.isConnected) {
      throw new Error('Wallet must be connected to restore documents');
    }

    setNftState({ isLoading: true, error: '', success: false });

    try {
      // 解析当前的 docMemo
      const docMemoData = parseDocMemoData(nft.docMemo);
      
      if (!docMemoData) {
        throw new Error('Cannot parse document memo data');
      }

      // 更新 isVisible 为 true
      const updatedDocMemoData: DocMemoData = {
        ...docMemoData,
        metadata: {
          ...docMemoData.metadata,
          isVisible: true
        }
      };

      // 调用合约更新 docMemo
      const txHash = await updateDocumentMemo(
        nft.tokenId,
        JSON.stringify(updatedDocMemoData),
        wallet.address
      );

      console.log('Document restored successfully, tx:', txHash);

      // 更新本地状态
      setUserNFTs(prevNFTs => 
        prevNFTs.map(n => 
          n.tokenId === nft.tokenId 
            ? { ...n, docMemo: JSON.stringify(updatedDocMemoData) }
            : n
        )
      );

      setNftState({ isLoading: false, error: '', success: true });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to restore document';
      setNftState({ isLoading: false, error, success: false });
      throw err;
    }
  }, [wallet.isConnected, wallet.address]);

  /**
   * 获取所有可见的 NFT（过滤掉被假删除的）
   * 
   * @returns 可见的 NFT 列表
   */
  const getVisibleNFTs = useCallback((): NFTInfo[] => {
    console.log('[GET_VISIBLE_NFTS] Starting to filter', userNFTs.length, 'NFTs');
    
    const visibleNFTs = userNFTs.filter((nft, index) => {
      const metadata = getDocumentMetadataFromNFT(nft);
      const isVisible = metadata.isVisible;
      
      console.log(`[GET_VISIBLE_NFTS] NFT ${nft.tokenId}: isVisible = ${isVisible}, fileName = ${metadata.fileName}`);
      
      if (!isVisible) {
        console.log(`[GET_VISIBLE_NFTS] NFT ${nft.tokenId} FILTERED OUT (not visible)`);
        console.log(`[GET_VISIBLE_NFTS] NFT ${nft.tokenId} docMemo preview:`, nft.docMemo.substring(0, 200));
      }
      
      return isVisible;
    });
    
    console.log('[GET_VISIBLE_NFTS] Filtered result:', visibleNFTs.length, 'visible NFTs');
    console.log('[GET_VISIBLE_NFTS] Visible tokenIds:', visibleNFTs.map(n => n.tokenId));
    
    return visibleNFTs;
  }, [userNFTs, getDocumentMetadataFromNFT]);

  /**
   * 获取所有隐藏的 NFT（被假删除的）
   * 
   * @returns 隐藏的 NFT 列表
   */
  const getHiddenNFTs = useCallback((): NFTInfo[] => {
    return userNFTs.filter(nft => {
      const metadata = getDocumentMetadataFromNFT(nft);
      return !metadata.isVisible;
    });
  }, [userNFTs, getDocumentMetadataFromNFT]);

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
    downloadAndDecryptWithMetaMaskCombined,
    createDocumentNFT,
    publishDocument,
    
    // NFT 相关
    loadUserNFTs,
    decryptDocumentFromNFT,
    getDocumentMetadataFromNFT,
    getVisibleNFTs,
    getHiddenNFTs,
    markDocumentAsHidden,
    restoreDocumentVisibility,
    
    // 版本控制相关
    updateDocument,
    restoreVersion,
    getVersionHistory,
    
    // 工具函数
    resetStates,
    
    // 便捷状态检查
    isAnyLoading: uploadState.isLoading || decryptState.isLoading || nftState.isLoading,
    hasAnyError: !!(uploadState.error || decryptState.error || nftState.error),
    allErrors: [uploadState.error, decryptState.error, nftState.error].filter(Boolean)
  };
}; 