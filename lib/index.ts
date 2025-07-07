/**
 * BlueDocs 核心功能库统一导出
 * 
 * 这个文件统一导出所有封装好的功能模块，包括：
 * - 加密和解密功能
 * - MetaMask 集成
 * - IPFS 存储操作
 * - 智能合约交互
 * - 文档处理工具
 * - 钱包管理 Hook
 * - 文档管理 Hook
 */

// 加密相关
export {
  encryptText,
  decryptData,
  isValidBase64,
  generateRandomKey,
  generateRandomNonce,
  type EncryptionResult
} from './encryption';

// MetaMask 加密
export {
  encryptWithMetaMask,
  decryptWithMetaMask,
  testMetaMaskEncryption,
  encryptMultipleWithMetaMask,
  decryptMultipleWithMetaMask,
  isValidEncryptedData,
  type EncryptedPayload
} from './metamask-crypto';

// IPFS 操作
export {
  uploadToIPFS,
  downloadFromIPFS,
  uploadTextToIPFS,
  downloadTextFromIPFS,
  isValidIPFSHash,
  generateIPFSGatewayURL,
  getIPFSGateways,
  downloadFromMultipleGateways,
  isPinataConfigured,
  type PinataUploadResponse,
  type IPFSUploadOptions
} from './ipfs';

// 智能合约
export {
  DOCUMENT_NFT_ABI,
  getContractAddress,
  getDocumentNFTContract,
  createDocumentNFT,
  mintDocumentFromIPFS,
  getUserNFTs,
  getDocumentInfo,
  getUserNFTBalance,
  getCurrentTokenId,
  parseEncryptionInfoFromMemo,
  isContractConfigured,
  type DocumentInfo,
  type NFTInfo,
  type CreateDocumentParams
} from './contract';

// 文档工具
export {
  DocumentType,
  detectDocumentType,
  generatePreview,
  extractTitle,
  generateDocumentMetadata,
  generateFileName,
  validateDocumentContent,
  formatFileSize,
  formatDateTime,
  generateDocumentId,
  compressContent,
  type DocumentMetadata
} from './document-utils';

// Hooks (从 hooks 目录重新导出)
export {
  useWallet,
  type WalletState
} from '../hooks/use-wallet';

export {
  useDocumentManager,
  type DocumentUploadResult,
  type DocumentDecryptResult,
  type OperationState
} from '../hooks/use-document-manager';

// 常用组合函数和工作流
export const BlueDocs = {
  // 检查所有必要的配置是否就绪
  isConfigured: (): boolean => {
    const { isPinataConfigured } = require('./ipfs');
    const { isContractConfigured } = require('./contract');
    return isPinataConfigured() && isContractConfigured();
  },
  
  // 获取配置状态
  getConfigStatus: () => {
    const { isPinataConfigured } = require('./ipfs');
    const { isContractConfigured } = require('./contract');
    return {
      pinata: isPinataConfigured(),
      contract: isContractConfigured(),
      metamask: typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
    };
  }
} as const; 